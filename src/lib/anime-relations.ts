export interface AnimeRelation { malId: number; title: string; image: string; format: string; relation: string }
const labels: Record<string, string> = {
  PREQUEL: 'Precuela', SEQUEL: 'Secuela', PARENT: 'Historia principal', SIDE_STORY: 'Historia paralela',
  ALTERNATIVE: 'Versión alternativa', SPIN_OFF: 'Historia derivada', SUMMARY: 'Resumen',
  COMPILATION: 'Recopilación', ADAPTATION: 'Adaptación', SOURCE: 'Obra original', OTHER: 'Relacionado', CHARACTER: 'Personajes compartidos',
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export function parseAnimeRelations(value: unknown, currentMalId: number): AnimeRelation[] {
  const edges = record(value).edges;
  if (!Array.isArray(edges)) return [];
  const items = new Map<number, AnimeRelation>();
  for (const edge of edges) {
    const { node: rawNode, relationType } = record(edge);
    const node = record(rawNode), title = record(node.title), cover = record(node.coverImage);
    const id = node.idMal;
    if (node.type !== 'ANIME' || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 || id === currentMalId) continue;
    const name = [title.english, title.romaji].find(value => typeof value === 'string' && value.trim());
    if (typeof name !== 'string') continue;
    let image = '';
    try { const url = new URL(typeof cover.large === 'string' ? cover.large : ''); if (url.protocol === 'https:' && url.hostname === 's4.anilist.co') image = url.href; } catch { /* Neutral cover. */ }
    if (!items.has(id)) items.set(id, { malId: id, title: name, image, format: typeof node.format === 'string' ? node.format : '', relation: typeof relationType === 'string' ? labels[relationType] ?? 'Relacionado' : 'Relacionado' });
  }
  return [...items.values()];
}
