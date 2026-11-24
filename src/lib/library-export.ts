import { libraryStatuses, safeWatchLink } from './library-editor';
import type { Theme } from './theme';

export type ExportSource = 'library' | 'hentai';
export type ExportField = 'title' | 'note' | 'score' | 'status' | 'progress' | 'total' | 'type' | 'format' | 'tags' | 'collections' | 'link' | 'origin' | 'created' | 'updated' | 'malId' | 'id' | 'image' | 'imageUrl' | 'titleEnglish' | 'titleRomaji' | 'year' | 'season' | 'genres' | 'catalogStatus';
export type ExportRow = Record<string, string | number | null>;
export interface ExportDataset { source: ExportSource; rows: ExportRow[] }
export interface ExportColumn { key: ExportField; label: string; width: number; sources?: ExportSource[]; date?: boolean; numeric?: boolean }
export interface ExportSettings { fields: ExportField[]; theme: Theme }

export const exportThemes: Record<Theme, { label: string; background: string; foreground: string }> = {
  'aurora-nocturna': { label: 'Aurora nocturna', background: '#4bf2c5', foreground: '#062a22' },
  'aurora-clara': { label: 'Aurora clara', background: '#087a63', foreground: '#ffffff' },
  estreno: { label: 'Estreno', background: '#ff5b3a', foreground: '#1a0600' },
};
export const exportColumns: ExportColumn[] = [
  { key: 'title', label: 'Título', width: 36 }, { key: 'note', label: 'Descripción propia', width: 48 },
  { key: 'score', label: 'Puntaje del catálogo', width: 22, numeric: true, sources: ['library'] },
  { key: 'status', label: 'Mi estado', width: 18, sources: ['library'] },
  { key: 'progress', label: 'Episodios / capítulos vistos', width: 28, numeric: true, sources: ['library'] },
  { key: 'total', label: 'Total de episodios / capítulos', width: 30, numeric: true, sources: ['library'] },
  { key: 'type', label: 'Tipo', width: 18 }, { key: 'format', label: 'Formato', width: 22, sources: ['library'] },
  { key: 'year', label: 'Año', width: 12, numeric: true, sources: ['library'] },
  { key: 'season', label: 'Temporada', width: 16, sources: ['library'] },
  { key: 'genres', label: 'Géneros', width: 36, sources: ['library'] },
  { key: 'catalogStatus', label: 'Estado de publicación', width: 24, sources: ['library'] },
  { key: 'tags', label: 'Etiquetas propias', width: 30 },
  { key: 'collections', label: 'Mis colecciones', width: 30, sources: ['library'] },
  { key: 'origin', label: 'Anime de origen / original', width: 30, sources: ['hentai'] },
  { key: 'link', label: 'Enlace personal', width: 42 },
  { key: 'created', label: 'Fecha de agregado', width: 22, date: true },
  { key: 'updated', label: 'Última edición del progreso', width: 28, date: true, sources: ['library'] },
  { key: 'malId', label: 'ID MAL', width: 14, numeric: true }, { key: 'id', label: 'ID en AniTrack', width: 40 },
  { key: 'titleEnglish', label: 'Título en inglés', width: 36, sources: ['library'] },
  { key: 'titleRomaji', label: 'Título en romaji', width: 36, sources: ['library'] },
  { key: 'imageUrl', label: 'URL de la portada', width: 42 }, { key: 'image', label: 'Portada incluida', width: 18 },
];
export function columnsFor(source: ExportSource): ExportColumn[] { return exportColumns.filter(column => !column.sources || column.sources.includes(source)); }
export function defaultExportFields(source: ExportSource): ExportField[] {
  return source === 'library' ? ['title', 'note', 'score', 'status', 'progress'] : ['title', 'note', 'type', 'origin', 'link'];
}
export function moveExportField(fields: ExportField[], from: ExportField, to: ExportField): ExportField[] {
  const fromIndex = fields.indexOf(from), toIndex = fields.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return fields;
  const result = [...fields]; result.splice(fromIndex, 1); result.splice(toIndex, 0, from); return result;
}
export function exportStatus(status: unknown, type: string): string | null {
  const found = libraryStatuses.find(item => item.value === status);
  return found ? (type === 'manga' ? found.manga : found.label) : typeof status === 'string' && status ? status : null;
}
export function isExportRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
export function parseExportDataset(value: unknown, source: ExportSource): ExportDataset {
  if (!isExportRecord(value) || value.source !== source || !Array.isArray(value.rows)) throw new Error('La respuesta de la exportación no es válida.');
  const rows = value.rows.map((item: unknown) => {
    if (!isExportRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') throw new Error('No pudimos leer todos los títulos para exportar.');
    const row: ExportRow = {};
    for (const { key } of columnsFor(source)) {
      const cell = item[key] ?? null;
      if ((typeof cell !== 'string' && typeof cell !== 'number' && cell !== null) || (typeof cell === 'number' && !Number.isFinite(cell))) throw new Error('La exportación contiene un dato inválido.');
      row[key] = cell;
    }
    return row;
  });
  return { source, rows };
}
export function validExportSettings(settings: ExportSettings, source: ExportSource): boolean {
  const allowed = columnsFor(source).map(column => column.key);
  return settings.fields.length > 0 && settings.fields.length === new Set(settings.fields).size && settings.fields.every(field => allowed.includes(field))
    && (settings.theme === 'aurora-clara' || settings.theme === 'aurora-nocturna' || settings.theme === 'estreno');
}
export function exportCell(row: ExportRow, column: ExportColumn): string | number | Date | null {
  const value = row[column.key] ?? null;
  if (column.date) return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
  if (column.key === 'link' || column.key === 'imageUrl') return typeof value === 'string' ? safeWatchLink(value) : null;
  return value;
}

const samplePool = [
  ['Fullmetal Alchemist: Brotherhood', 'La historia que siempre vuelvo a ver.', 9.1, 'Completado', 64],
  ['Frieren', 'Seguir el viaje el fin de semana.', 9.3, 'Viendo', 12],
  ['Haikyuu!!', 'Para mirar con amigos.', 8.5, 'Pendiente', 0],
  ['Mob Psycho 100', 'Me gustó mucho la animación.', 8.5, 'Completado', 12],
  ['Violet Evergarden', 'Continuar desde el último episodio.', 8.7, 'En pausa', 5],
];
export function sampleExportRows(source: ExportSource): ExportRow[] {
  return [...samplePool].sort(() => Math.random() - 0.5).slice(0, 3).map((sample, index) => ({
    id: `ejemplo-${index + 1}`, title: source === 'hentai' ? ['Historia original', 'Relato de Naruto', 'Otra historia original'][index] : String(sample[0]),
    note: String(sample[1]), score: Number(sample[2]), status: String(sample[3]), progress: Number(sample[4]), total: 64,
    type: source === 'hentai' ? (index === 1 ? 'Doujin/Manga' : 'Anime') : 'Anime', format: 'Serie de anime',
    origin: index === 1 ? 'Naruto' : 'Original', tags: 'Recomendados', collections: 'Para volver a ver',
    link: 'https://ejemplo.com/serie', created: '2026-01-15T12:00:00Z', updated: '2026-02-01T12:00:00Z', malId: 100 + index,
    titleEnglish: 'Título de ejemplo', titleRomaji: 'Título de ejemplo', imageUrl: 'https://ejemplo.com/portada.jpg', image: null,
  }));
}
