import 'server-only';

import type { CharacterDetail } from '@/interfaces/character';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCharacterById, searchCharacters } from '@/services/anilist-characters';
import { scrapeMalCharacterDetail, scrapeMalCharacterSearch } from '@/services/myanimelist-characters-scraper';
import type { ProfileHighlight } from '@/types/profile-highlights';

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).sort().join(' ');
}

function japaneseVoiceActor(character: CharacterDetail) {
  return character.voiceActors.find((actor) => /japanese|japon[eé]s/i.test(actor.language))?.name ?? null;
}

function matchScore(source: CharacterDetail, candidate: CharacterDetail) {
  let score = normalized(source.name) === normalized(candidate.name) ? 50 : 0;
  const sourceActor = japaneseVoiceActor(source);
  const candidateActor = japaneseVoiceActor(candidate);
  if (sourceActor && candidateActor && normalized(sourceActor) === normalized(candidateActor)) score += 35;
  if (source.birthday && candidate.birthday && normalized(source.birthday) === normalized(candidate.birthday)) score += 10;
  if (source.appearances.some((appearance) => candidate.appearances.some((other) => other.malId === appearance.malId && other.type === appearance.type))) score += 5;
  return score;
}

async function loadSource(item: ProfileHighlight) {
  try {
    return item.provider === 'myanimelist'
      ? await scrapeMalCharacterDetail(item.external_id)
      : await getCharacterById(item.external_id);
  } catch {
    return null;
  }
}

async function findCounterpart(source: CharacterDetail, provider: 'anilist' | 'myanimelist') {
  try {
    const search = provider === 'anilist' ? await searchCharacters(source.name) : await scrapeMalCharacterSearch(source.name);
    const candidates = search.characters.filter((item) => item.provider === provider && normalized(item.name) === normalized(source.name)).slice(0, 3);
    for (const candidate of candidates) {
      const detail = provider === 'anilist' ? await getCharacterById(candidate.id) : await scrapeMalCharacterDetail(candidate.malId ?? candidate.id);
      const confidence = matchScore(source, detail);
      if (confidence >= 85) return { detail, confidence };
    }
  } catch {
    // La relación es una mejora opcional: guardar el favorito no depende del otro proveedor.
  }
  return null;
}

export async function resolveFavoriteCharacter(item: ProfileHighlight) {
  const admin = createSupabaseAdminClient();
  const provider = item.provider ?? 'anilist';
  const idColumn = provider === 'myanimelist' ? 'mal_id' : 'anilist_id';
  const { data: existing } = await admin.from('characters').select('id').eq(idColumn, item.external_id).maybeSingle();
  if (existing?.id) return existing.id as string;

  const source = await loadSource(item);
  const counterpart = source ? await findCounterpart(source, provider === 'anilist' ? 'myanimelist' : 'anilist') : null;
  const anilistId = provider === 'anilist' ? item.external_id : counterpart?.detail.id ?? null;
  const malId = provider === 'myanimelist' ? item.external_id : counterpart?.detail.malId ?? counterpart?.detail.id ?? null;
  const actor = source ? japaneseVoiceActor(source) : null;
  const values = {
    anilist_id: anilistId,
    mal_id: malId,
    name: source?.name || item.title,
    normalized_name: normalized(source?.name || item.title),
    image_url: source?.image || item.image_url || null,
    japanese_va_name: actor,
    birthday: source?.birthday || null,
    source_provider: provider,
    match_confidence: counterpart?.confidence ?? 0,
    updated_at: new Date().toISOString(),
  };

  const lookup = anilistId ? ['anilist_id', anilistId] as const : ['mal_id', malId] as const;
  const { data: matched } = await admin.from('characters').select('id').eq(lookup[0], lookup[1]).maybeSingle();
  if (matched?.id) {
    await admin.from('characters').update(values).eq('id', matched.id);
    return matched.id as string;
  }
  const { data, error } = await admin.from('characters').insert(values).select('id').single();
  if (error) throw error;
  return data.id as string;
}
