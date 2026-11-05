import 'server-only';
import { unstable_cache } from 'next/cache';

// The compact index fits in the Next data cache; the full source file does not.
export const getCalendarMappings = unstable_cache(
  async () => {
    const response = await fetch(
      'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json',
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!response.ok) throw new Error('No se pudo consultar el índice de equivalencias');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Índice de equivalencias inválido');
    const byImdb: Record<string, number[]> = {};
    const byMal: Record<number, { ani?: number; imdb?: string }> = {};
    for (const row of data) {
      if (!Number.isSafeInteger(row?.mal_id) || row.mal_id <= 0) continue;
      const ids = Array.isArray(row.imdb_id)
        ? row.imdb_id.filter((id: unknown): id is string => typeof id === 'string' && /^tt\d+$/.test(id))
        : [];
      for (const id of ids) (byImdb[id] ??= []).push(row.mal_id);
      if (ids.length || Number.isSafeInteger(row.anilist_id)) {
        byMal[row.mal_id] = {
          ani: Number.isSafeInteger(row.anilist_id) ? row.anilist_id : undefined,
          imdb: ids.length === 1 ? ids[0] : undefined,
        };
      }
    }
    return { byImdb, byMal };
  },
  ['calendar-provider-identities-v1'],
  { revalidate: 86400 },
);
