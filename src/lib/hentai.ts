import { safeWatchLink } from '@/lib/library-editor';
import type { HentaiEntry, HentaiFilters } from '@/interfaces/hentai';

export function normalizeHentaiSource(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function parseHentaiFilters(params: Record<string, unknown>): HentaiFilters {
  const page = typeof params.page === 'string' ? Number(params.page) : 1;
  const origin = typeof params.origin === 'string' ? params.origin : 'all';
  const source = origin.startsWith('anime:') ? normalizeHentaiSource(origin.slice(6)) : '';
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: typeof params.q === 'string' ? params.q.trim().slice(0, 200) : '',
    type: params.type === 'anime' || params.type === 'doujin' ? params.type : 'all',
    origin: origin === 'original' ? origin : source && source.length <= 200 ? `anime:${source}` : 'all',
    sort: params.sort === 'oldest' || params.sort === 'title-asc' || params.sort === 'title-desc' ? params.sort : 'newest',
  };
}

export function parseHentaiInput(formData: FormData): { data: {
  title: string; type: HentaiEntry['type']; image: string | null; description: string | null; watch_link: string | null;
  source_anime: string | null; is_original: boolean;
} } | { error: string } {
  const title = formData.get('title');
  const type = formData.get('type');
  const image = formData.get('image') ?? '';
  const description = formData.get('description') ?? '';
  const link = formData.get('watch_link') ?? '';
  const origin = formData.get('origin_kind') ?? 'unspecified';
  const rawSource = formData.get('source_anime') ?? '';
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 300) return { error: 'Escribí un título de hasta 300 caracteres.' };
  if (type !== 'anime' && type !== 'doujin') return { error: 'Elegí Anime o Doujin/Manga.' };
  if (origin !== 'unspecified' && origin !== 'original' && origin !== 'anime') return { error: 'Elegí el origen del título.' };
  if (typeof rawSource !== 'string' || rawSource.length > 1000) return { error: 'El nombre del anime puede tener hasta 200 caracteres.' };
  const source = normalizeHentaiSource(rawSource);
  if (origin === 'anime' && (!source || source.length > 200)) return { error: 'Escribí el anime al que pertenece, de hasta 200 caracteres.' };
  if (typeof description !== 'string' || description.length > 10000) return { error: 'La nota puede tener hasta 10.000 caracteres.' };
  if (typeof image !== 'string' || image.length > 2000 || (image.trim() && !safeWatchLink(image))) return { error: 'Usá una URL http o https válida para la portada.' };
  if (typeof link !== 'string' || link.length > 2000 || (link.trim() && !safeWatchLink(link))) return { error: 'Usá un enlace http o https válido.' };
  return { data: { title: title.trim(), type, image: safeWatchLink(image), description: description.trim() || null, watch_link: safeWatchLink(link),
    source_anime: origin === 'anime' ? source : null, is_original: origin === 'original' } };
}

export function parseHentaiEntry(value: unknown): HentaiEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!('id' in value) || !('title' in value) || !('type' in value) || !('created_at' in value)) return null;
  if ((typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.title !== 'string' || typeof value.created_at !== 'string') return null;
  if (value.type !== 'anime' && value.type !== 'doujin') return null;
  const malId = 'mal_id' in value && value.mal_id != null ? Number(value.mal_id) : null;
  if (malId !== null && (!Number.isSafeInteger(malId) || malId <= 0)) return null;
  return {
    id: String(value.id), title: value.title, type: value.type, created_at: value.created_at, mal_id: malId,
    image: 'image' in value && typeof value.image === 'string' ? value.image : null,
    description: 'description' in value && typeof value.description === 'string' ? value.description : null,
    watch_link: 'watch_link' in value && typeof value.watch_link === 'string' ? value.watch_link : null,
    source_anime: 'source_anime' in value && typeof value.source_anime === 'string' ? value.source_anime : null,
    is_original: 'is_original' in value && value.is_original === true,
    revision: 'revision' in value && typeof value.revision === 'string' ? value.revision : null,
  };
}
