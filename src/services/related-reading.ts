import 'server-only';

import * as cheerio from 'cheerio';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RelatedReading } from '@/interfaces/related-reading';
import { relatedReadingImage } from '@/lib/related-reading-image';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const MAL_URL = 'https://myanimelist.net';
const ANILIST_URL = 'https://graphql.anilist.co';
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

function clean(text: string) { return text.replace(/\s+/g, ' ').trim(); }

function readingFormat(value: string): RelatedReading['format'] {
  return /novel/i.test(value) ? 'novel' : 'manga';
}

function relationLabel(value: string) {
  const normalized = value.trim().toUpperCase().replaceAll(' ', '_');
  return ({ ADAPTATION: 'Adaptación', SOURCE: 'Obra original', SIDE_STORY: 'Historia paralela', SPIN_OFF: 'Historia derivada', ALTERNATIVE: 'Versión alternativa' } as Record<string, string>)[normalized] || value;
}

function unique(items: RelatedReading[]) {
  return [...new Map(items.map((item) => [item.malId, item])).values()];
}

async function scrapeMalRelations(animeMalId: number): Promise<RelatedReading[]> {
  const response = await fetch(`${MAL_URL}/anime/${animeMalId}/_`, {
    headers: { Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0 (compatible; AniTrack/1.0)' },
    signal: AbortSignal.timeout(12_000), next: { revalidate: 24 * 60 * 60 },
  });
  if (!response.ok) throw new Error(`MyAnimeList respondió ${response.status}`);
  const $ = cheerio.load(await response.text());
  if (!$('.related-entries').length) {
    if ($('h1.title-name').length) return [];
    throw new Error('No se encontró la sección de relaciones de MyAnimeList');
  }

  const result: RelatedReading[] = [];
  $('.related-entries .entries-tile .entry').each((_, element) => {
    const entry = $(element);
    const link = entry.find('.title a[href*="/manga/"]').first();
    const malId = Number(link.attr('href')?.match(/\/manga\/(\d+)/)?.[1]);
    const title = clean(link.text());
    if (!malId || !title) return;
    const relationText = clean(entry.find('.relation').text());
    const image = relatedReadingImage(entry.find('img').attr('data-src') || entry.find('img').attr('src') || '');
    result.push({ malId, title, image, format: readingFormat(relationText), relation: relationLabel(relationText.replace(/\s*\([^)]*\)\s*$/, '')) });
  });
  $('.related-entries .entries-table tr').each((_, element) => {
    const row = $(element);
    const relation = relationLabel(clean(row.find('td').first().text()).replace(/:$/, ''));
    row.find('li').each((__, listItem) => {
      const link = $(listItem).find('a[href*="/manga/"]').first();
      const malId = Number(link.attr('href')?.match(/\/manga\/(\d+)/)?.[1]);
      const title = clean(link.text());
      if (!malId || !title) return;
      result.push({ malId, title, image: '', format: readingFormat(clean($(listItem).text())), relation });
    });
  });
  return unique(result);
}

interface AnilistRelation {
  relationType: string;
  node: { idMal: number | null; type: string; format: string | null; title: { romaji: string; english: string | null }; coverImage: { extraLarge: string | null; large: string | null; medium: string | null } };
}

async function fetchAnilistRelations(animeMalId: number): Promise<RelatedReading[]> {
  const query = `query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { relations { edges { relationType node { idMal type format title { romaji english } coverImage { extraLarge large medium } } } } } }`;
  const response = await fetch(ANILIST_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { idMal: animeMalId } }),
    signal: AbortSignal.timeout(10_000), next: { revalidate: 24 * 60 * 60 },
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const payload = await response.json() as { data?: { Media?: { relations?: { edges?: AnilistRelation[] } } }; errors?: unknown[] };
  if (!payload.data?.Media || payload.errors?.length) throw new Error('AniList no devolvió relaciones');
  return unique((payload.data.Media.relations?.edges ?? []).flatMap(({ relationType, node }) => {
    if (node?.type !== 'MANGA' || !node.idMal) return [];
    return [{ malId: node.idMal, title: node.title.english || node.title.romaji, image: node.coverImage?.extraLarge || node.coverImage?.large || node.coverImage?.medium || '', format: readingFormat(node.format || ''), relation: relationLabel(relationType) }];
  }));
}

export async function fetchRelatedReading(animeMalId: number): Promise<RelatedReading[]> {
  try {
    return await scrapeMalRelations(animeMalId);
  } catch (error) {
    console.warn(`No se pudieron leer las relaciones de MAL para ${animeMalId}:`, error);
    return fetchAnilistRelations(animeMalId);
  }
}

export async function refreshStoredRelatedReading(client: SupabaseClient, mediaId: string, animeMalId: number): Promise<RelatedReading[]> {
  const related = await fetchRelatedReading(animeMalId);
  const { error } = await client.from('media').update({ related_reading: related, related_reading_checked_at: new Date().toISOString() }).eq('id', mediaId);
  if (error) throw error;
  return related;
}

export async function getAnimeRelatedReading(animeMalId: number): Promise<RelatedReading[]> {
  let client: SupabaseClient | null = null;
  let stored: { id: string; related_reading: RelatedReading[] | null; related_reading_checked_at: string | null } | null = null;
  try {
    client = createSupabaseAdminClient();
    const { data, error } = await client.from('media').select('id, related_reading, related_reading_checked_at').eq('mal_id', animeMalId).eq('type', 'anime').maybeSingle();
    if (!error) stored = data;
  } catch (error) {
    console.warn('No se pudo consultar el caché de lecturas relacionadas:', error);
  }

  const checkedAt = stored?.related_reading_checked_at ? Date.parse(stored.related_reading_checked_at) : 0;
  if (checkedAt && Date.now() - checkedAt < STALE_AFTER_MS) return stored?.related_reading ?? [];

  try {
    if (client && stored) return await refreshStoredRelatedReading(client, stored.id, animeMalId);
    return await fetchRelatedReading(animeMalId);
  } catch (error) {
    console.warn(`No se pudieron actualizar las lecturas relacionadas de ${animeMalId}:`, error);
    return stored?.related_reading ?? [];
  }
}
