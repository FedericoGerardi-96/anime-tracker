import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { readAllPages, readInBatches } from '@/lib/read-all-pages';
import { isExportRecord, exportStatus, type ExportDataset, type ExportRow, type ExportSource } from '@/lib/library-export';
import { formatLabel } from '@/lib/library-editor';

const text = (value: unknown): string | null => typeof value === 'string' ? value : null;
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
function record(value: unknown): Record<string, unknown> {
  if (!isExportRecord(value)) throw new Error('No pudimos leer todos los datos de tu colección.');
  return value;
}
function id(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('No pudimos identificar un título de tu colección.');
  return String(value);
}

export async function readLibraryExport(source: ExportSource): Promise<ExportDataset | null> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  if (source === 'hentai') {
    const entries = await readAllPages((from, to) => supabase.from('hentai').select('*').eq('user_id', user.id).order('id').range(from, to));
    const rows = entries.map((value: unknown): ExportRow => {
      const entry = record(value);
      if (typeof entry.title !== 'string' || (entry.type !== 'anime' && entry.type !== 'doujin')) throw new Error('Un título de Hentai tiene datos inválidos.');
      return { id: id(entry.id), title: entry.title, note: text(entry.description), type: entry.type === 'anime' ? 'Anime' : 'Doujin/Manga',
        origin: entry.is_original === true ? 'Original' : text(entry.source_anime), link: text(entry.watch_link), created: text(entry.created_at),
        malId: number(entry.mal_id), image: text(entry.image), imageUrl: text(entry.image),
        tags: Array.isArray(entry.tags) ? entry.tags.filter((tag: unknown): tag is string => typeof tag === 'string').join(', ') : null };
    });
    return { source, rows };
  }
  const [favorites, progress, memberships] = await Promise.all([
    readAllPages((from, to) => supabase.from('favorites').select('id,media_id,created_at').eq('user_id', user.id).order('id').range(from, to)),
    readAllPages((from, to) => supabase.from('user_media_progress').select('id,media_id,status,current_episode,custom_description,custom_tags,watch_link,updated_at').eq('user_id', user.id).order('id').range(from, to)),
    readAllPages((from, to) => supabase.from('list_media').select('id,media_id,created_at,lists!inner(id,name,user_id)').eq('lists.user_id', user.id).order('id').range(from, to)),
  ]);
  const personal = new Map<string, Record<string, unknown>>();
  const added = new Map<string, string | null>();
  const collections = new Map<string, Set<string>>();
  const include = (value: unknown) => {
    const row = record(value), mediaId = id(row.media_id), date = text(row.created_at);
    const previous = added.get(mediaId);
    if (!added.has(mediaId) || (date && (!previous || date < previous))) added.set(mediaId, date);
    return { row, mediaId };
  };
  for (const row of favorites) include(row);
  for (const value of progress) { const { row, mediaId } = include(value); personal.set(mediaId, row); }
  for (const value of memberships) {
    const membership = record(value);
    const list = record(Array.isArray(membership.lists) ? membership.lists[0] : membership.lists);
    if (list.user_id !== user.id) throw new Error('No pudimos verificar el titular de una colección.');
    const { mediaId } = include(value);
    const names = collections.get(mediaId) ?? new Set<string>();
    if (typeof list.name === 'string') names.add(list.name);
    collections.set(mediaId, names);
  }
  const mediaRows = await readInBatches([...added.keys()], batch => supabase.from('media')
    .select('id,mal_id,title,title_english,title_romaji,type,image,format,score,total_units,year,season,genres,status').in('id', batch));
  const mediaById = new Map(mediaRows.map((value: unknown) => { const row = record(value); return [id(row.id), row]; }));
  const rows = [...added].map(([mediaId, created]): ExportRow => {
    const media = mediaById.get(mediaId);
    if (!media || typeof media.title !== 'string' || (media.type !== 'anime' && media.type !== 'manga')) throw new Error('Faltan datos de un título. Reintentá la exportación para evitar un archivo incompleto.');
    const p = personal.get(mediaId);
    return { id: mediaId, title: media.title, titleEnglish: text(media.title_english), titleRomaji: text(media.title_romaji),
      note: text(p?.custom_description), score: number(media.score), status: exportStatus(p?.status, media.type), progress: number(p?.current_episode), total: number(media.total_units),
      type: media.type === 'anime' ? 'Anime' : 'Manga', format: formatLabel(media.type, text(media.format)),
      year: number(media.year), season: text(media.season), catalogStatus: text(media.status),
      genres: Array.isArray(media.genres) ? media.genres.filter((genre: unknown): genre is string => typeof genre === 'string').join(', ') : null,
      tags: Array.isArray(p?.custom_tags) ? p.custom_tags.filter((tag: unknown): tag is string => typeof tag === 'string').join(', ') : null,
      collections: [...(collections.get(mediaId) ?? [])].sort((a, b) => a.localeCompare(b, 'es')).join(', '),
      link: text(p?.watch_link), created, updated: text(p?.updated_at), malId: number(media.mal_id), image: text(media.image), imageUrl: text(media.image) };
  });
  rows.sort((a, b) => String(a.title).localeCompare(String(b.title), 'es') || String(a.id).localeCompare(String(b.id)));
  return { source, rows };
}
