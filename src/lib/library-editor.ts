export const libraryStatuses = [
  { value: 'watching', label: 'Viendo', manga: 'Leyendo' },
  { value: 'plan_to_watch', label: 'Pendiente', manga: 'Pendiente' },
  { value: 'completed', label: 'Completado', manga: 'Completado' },
  { value: 'on_hold', label: 'En pausa', manga: 'En pausa' },
  { value: 'dropped', label: 'Abandonado', manga: 'Abandonado' },
] as const;
export type LibraryStatus = typeof libraryStatuses[number]['value'];
export function safeWatchLink(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try { const url = new URL(value.trim()); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function formatLabel(type: string, format?: string | null) {
  const names: Record<string, string> = { TV: 'Serie de anime', TV_SHORT: 'Anime corto', MOVIE: 'Película', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Especial', MANGA: 'Manga', NOVEL: 'Novela', LIGHT_NOVEL: 'Novela ligera', ONE_SHOT: 'One-shot', MUSIC: 'Video musical' };
  return names[format?.toUpperCase() ?? ''] ?? (type === 'manga' ? 'Manga' : 'Anime');
}
export interface LibraryRow {
  editorVersion?: { exists: boolean; revision: string | null };
  id: string; malId: number; title: string; image: string; type: 'anime' | 'manga';
  format?: string | null; score?: number | null; total?: number | null;
  catalogStatus?: string | null;
  status?: string | null; episode: number; note: string; tags: string[]; watchLink: string;
}
export interface EditorSnapshot {
  exists: boolean; revision: string | null; status: string | null; episode: number;
  note: string; tags: string[]; watchLink: string; total: number | null;
}
export type LibraryEdit = { kind: 'progress'; status: LibraryStatus; episode: number } | { kind: 'metadata'; note: string; tags: string[]; watchLink: string };
export function validLibraryEdit(value: LibraryEdit): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value.kind === 'progress') return libraryStatuses.some(s => s.value === value.status) && Number.isInteger(value.episode) && value.episode >= 0 && value.episode <= 1000000;
  return value.kind === 'metadata' && typeof value.note === 'string' && value.note.length <= 10000
    && typeof value.watchLink === 'string' && value.watchLink.length <= 2000 && (!value.watchLink.trim() || Boolean(safeWatchLink(value.watchLink)))
    && Array.isArray(value.tags) && value.tags.length <= 30 && value.tags.every(tag => typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 60);
}


export function editorSnapshotFromRow(row: LibraryRow): EditorSnapshot | null {
  if (!row.editorVersion) return null;
  return {
    ...row.editorVersion, status: row.status ?? null, episode: row.episode,
    note: row.note, tags: row.tags, watchLink: row.watchLink, total: row.total ?? null,
  };
}
