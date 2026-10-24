import "server-only";
import { cache } from "react";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReadingSuggestion, RelatedReading } from '@/interfaces/related-reading';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { refreshStoredRelatedReading } from '@/services/related-reading';
import { getAuthenticatedUser } from '@/services/supabase';
import {
  getMalAnimeRecommendations,
  getMalScheduleToday,
  getMalTopAnime,
  getMalUpcomingAnime,
  isMyAnimeListUnavailableError,
} from "@/lib/myanimelist-service";

async function loadSection<T>(request: Promise<T>, fallback: T) {
  try {
    return { data: await request, unavailable: false };
  } catch (error) {
    if (isMyAnimeListUnavailableError(error)) return { data: fallback, unavailable: true };
    throw error;
  }
}

// Request-scoped: both sections reuse today's result, including provider failures.
export const getHomeToday = cache(() => loadSection(getMalScheduleToday(), []));
export const getHomeUpcoming = () => loadSection(getMalUpcomingAnime(6), []);
export const getHomeTopAnime = () => loadSection(getMalTopAnime(10), []);

export async function getHomeRecommendations() {
  const today = await getHomeToday();
  const seed = today.data.find(anime => anime.popularity) ?? today.data[0];
  if (!seed) return { data: [], seed, unavailable: today.unavailable };
  const result = await loadSection(getMalAnimeRecommendations(seed.mal_id), []);
  return { ...result, data: result.data.slice(0, 4), seed };
}

async function getStoredReadingSuggestions(client: SupabaseClient, userId: string): Promise<ReadingSuggestion[] | null> {
  const { data: anime, error } = await client.from('media')
    .select('mal_id, title, related_reading, user_media_progress!inner(user_id, status)')
    .eq('type', 'anime')
    .eq('user_media_progress.user_id', userId)
    .eq('user_media_progress.status', 'completed')
    .neq('related_reading', '[]')
    .order('score', { ascending: false })
    .limit(100);
  if (error) {
    console.error('No se pudieron cargar las lecturas relacionadas:', error);
    return null;
  }

  const candidates: ReadingSuggestion[] = (anime ?? []).flatMap((item) =>
    ((Array.isArray(item.related_reading) ? item.related_reading : []) as RelatedReading[]).map((reading) => ({
      animeMalId: item.mal_id as number,
      animeTitle: item.title as string,
      reading,
    })),
  );
  if (!candidates.length) return [];

  const mangaIds = [...new Set(candidates.map(({ reading }) => reading.malId))];
  const { data: excluded, error: excludedError } = await client.from('user_media_progress')
    .select('media!inner(mal_id)')
    .eq('user_id', userId)
    .in('status', ['plan_to_watch', 'dropped', 'completed'])
    .eq('media.type', 'manga')
    .in('media.mal_id', mangaIds);
  if (excludedError) {
    console.error('No se pudo filtrar el progreso de manga:', excludedError);
    return null;
  }
  const excludedIds = new Set((excluded ?? []).map((row) => {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    return media?.mal_id;
  }));
  const seen = new Set<number>();
  const eligible = candidates.filter(({ reading }) => {
    if (excludedIds.has(reading.malId) || seen.has(reading.malId)) return false;
    seen.add(reading.malId);
    return true;
  });
  const animeSeen = new Set<number>();
  const varied = eligible.filter(({ animeMalId }) => {
    if (animeSeen.has(animeMalId)) return false;
    animeSeen.add(animeMalId);
    return true;
  });
  return [...varied, ...eligible.filter((item) => !varied.includes(item))].slice(0, 4);
}

async function discoverReadingForCompletedAnime(admin: SupabaseClient, userId: string) {
  try {
    const { data, error } = await admin.from('media')
      .select('id, mal_id, user_media_progress!inner(user_id, status)')
      .eq('type', 'anime')
      .is('related_reading_checked_at', null)
      .eq('user_media_progress.user_id', userId)
      .eq('user_media_progress.status', 'completed')
      .order('score', { ascending: false })
      .limit(8);
    if (error) throw error;
    for (let offset = 0; offset < (data?.length ?? 0); offset += 4) {
      const batch = data!.slice(offset, offset + 4);
      const results = await Promise.allSettled(batch.map((item) => refreshStoredRelatedReading(admin, item.id, item.mal_id)));
      for (const result of results) if (result.status === 'rejected') console.warn('No se pudo consultar una lectura relacionada:', result.reason);
    }
  } catch (error) {
    console.warn('No se pudieron descubrir lecturas para la Home:', error);
  }
}

export async function getHomeReadingSuggestions(): Promise<ReadingSuggestion[]> {
  const user = await getAuthenticatedUser();
  if (!user) return [];
  const admin = createSupabaseAdminClient();
  const stored = await getStoredReadingSuggestions(admin, user.id);
  if (stored === null || stored.length >= 4) return stored ?? [];
  await discoverReadingForCompletedAnime(admin, user.id);
  return (await getStoredReadingSuggestions(admin, user.id)) ?? stored;
}
