import type { CatalogAnime, CatalogManga } from '@/interfaces/media-catalog';
import { getCatalogStatusLabel } from '@/lib/media-status';

const FORMATS: Record<string, string> = {
  tv: 'Serie de TV', tv_short: 'Serie corta', movie: 'Película', special: 'Especial',
  ova: 'OVA', ona: 'ONA', music: 'Vídeo musical', manga: 'Manga',
  novel: 'Novela', light_novel: 'Novela ligera', one_shot: 'One-shot',
  manhwa: 'Manhwa', manhua: 'Manhua', doujinshi: 'Doujinshi',
};
const SOURCES: Record<string, string> = {
  original: 'Obra original', manga: 'Manga', light_novel: 'Novela ligera',
  visual_novel: 'Novela visual', novel: 'Novela', web_novel: 'Novela web',
  game: 'Videojuego', video_game: 'Videojuego', other: 'Otro',
  anime: 'Anime', comic: 'Cómic', picture_book: 'Libro ilustrado',
  doujinshi: 'Doujinshi', four_koma_manga: 'Manga de cuatro viñetas',
  book: 'Libro', music: 'Música', multimedia_project: 'Proyecto multimedia',
};
const SEASONS: Record<string, string> = { winter: 'Invierno', spring: 'Primavera', summer: 'Verano', fall: 'Otoño' };
const normalize = (value: string) => value.trim().toLowerCase().replaceAll(' ', '_');
const label = (value: string, labels: Record<string, string>) => labels[normalize(value)] ?? value.replaceAll('_', ' ');

// Dates may contain only a year or a year and month. Never invent missing parts.
export function formatCatalogDate(value?: string | null): string | null {
  if (!value || !/^\d{4}(-\d{2}){0,2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year) return null;
  if (!month) return String(year);
  if (month > 12) return null;
  const date = new Date(Date.UTC(year, month - 1, day || 1));
  if (day && (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1)) return null;
  return new Intl.DateTimeFormat('es-AR', { year: 'numeric', month: 'short', ...(day ? { day: 'numeric' as const } : {}), timeZone: 'UTC' }).format(date);
}

export function buildMediaDetailMetadata(media: CatalogAnime | CatalogManga, type: 'anime' | 'manga') {
  const names: Array<{ label: string; value: string }> = [];
  const addName = (name: string, value?: string | null) => {
    if (value?.trim()) names.push({ label: name, value: value.trim() });
  };
  addName('Inglés', media.title_english);
  addName('Japonés (rōmaji)', media.title);
  addName('Japonés', media.title_japanese);
  const existing = new Set(names.map(name => name.value.toLowerCase()));
  const synonyms = [...new Set((media.title_synonyms ?? []).map(name => name.trim()).filter(name => name && !existing.has(name.toLowerCase())))];
  if (synonyms.length) addName('Otros nombres', synonyms.join(' · '));

  const metadata: Array<{ label: string; value: string }> = [];
  const add = (name: string, value?: string | number | null) => {
    if (value) metadata.push({ label: name, value: String(value) });
  };
  add('Formato', media.type ? label(media.type, FORMATS) : null);
  add('Estado', media.status ? getCatalogStatusLabel(media.status, type) : null);
  add('Año', media.year);
  if ('season' in media && media.season) add('Temporada', label(media.season, SEASONS));
  add('Inicio', formatCatalogDate(media.start_date));
  add('Fin', formatCatalogDate(media.end_date));
  if ('source' in media && media.source && normalize(media.source) !== 'unknown') add('Basado en', label(media.source, SOURCES));
  if (type === 'anime' && media.duration_minutes && media.duration_minutes > 0) add('Duración por episodio', `${Math.round(media.duration_minutes)} min`);
  if ('studios' in media) add('Estudios', media.studios.map(studio => studio.name).join(', '));
  if ('authors' in media) add('Autores', [...new Set(media.authors.map(author => author.name))].join(', '));
  if ('volumes' in media) add('Volúmenes', media.volumes);
  add(type === 'anime' ? 'Episodios' : 'Capítulos', 'episodes' in media ? media.episodes : media.chapters);
  return { names, metadata };
}
