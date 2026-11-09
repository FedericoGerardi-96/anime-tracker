import 'server-only';
import { unstable_cache } from 'next/cache';
import { getCalendarMappings } from '@/services/calendar-mappings';

const DATASET = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const IMDB_ID = /^tt\d+$/;

const getCachedRatings = unstable_cache(async () => {
  const { byImdb } = await getCalendarMappings();
  const response = await fetch(DATASET, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!response.ok || !response.body) throw new Error('No se pudo leer el archivo de IMDb');

  // Keep only the scores used by our title mappings in the Next data cache.
  const ratings: Record<string, number> = {};
  const reader = response.body.pipeThrough(new DecompressionStream('gzip')).pipeThrough(new TextDecoderStream()).getReader();
  let pending = '';
  let hasHeader = false;

  function readLine(line: string) {
    if (!hasHeader) {
      if (line.trimEnd() !== 'tconst\taverageRating\tnumVotes') throw new Error('Formato de IMDb inesperado');
      hasHeader = true;
      return;
    }
    const [id, value, votes] = line.split('\t');
    if (!Object.hasOwn(byImdb, id)) return;
    const score = Number(value);
    const count = Number(votes);
    if (score >= 1 && score <= 10 && Number.isSafeInteger(count) && count > 0) ratings[id] = score;
  }

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = (pending + value).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) readLine(line);
    }
    if (pending) readLine(pending);
    if (!Object.keys(ratings).length) throw new Error('IMDb no devolvió puntajes para el índice de anime');
    return ratings;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}, ['anime-imdb-ratings-v1'], { revalidate: 86400 });

let inFlight: ReturnType<typeof getCachedRatings> | undefined;

export async function getImdbScore(id: string | undefined): Promise<number | null> {
  if (!id || !IMDB_ID.test(id)) return null;
  try {
    inFlight ??= getCachedRatings().finally(() => { inFlight = undefined; });
    return (await inFlight)[id] ?? null;
  } catch {
    return null;
  }
}
