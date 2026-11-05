export const CATALOG_GENRES = [
  ['Action', 'Acción'], ['Adventure', 'Aventura'], ['Comedy', 'Comedia'], ['Drama', 'Drama'],
  ['Ecchi', 'Ecchi'], ['Fantasy', 'Fantasía'], ['Horror', 'Terror'], ['Mahou Shoujo', 'Chicas mágicas'],
  ['Mecha', 'Mecha'], ['Music', 'Música'], ['Mystery', 'Misterio'], ['Psychological', 'Psicológico'],
  ['Romance', 'Romance'], ['Sci-Fi', 'Ciencia ficción'], ['Slice of Life', 'Recuentos de la vida'],
  ['Sports', 'Deportes'], ['Supernatural', 'Sobrenatural'], ['Thriller', 'Suspenso'],
] as const;

export const CATALOG_FILTER_KEYS = ['q', 'genre', 'excludeGenre', 'status', 'year', 'yearFrom', 'yearTo', 'season', 'format', 'scoreBands', 'minScore', 'sort'] as const;

export function updateCatalogFilterParams(current: URLSearchParams, changes: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}
