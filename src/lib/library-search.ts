export function normalizeLibraryText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesLibrarySearch(query: string, values: unknown[]): boolean {
  const words = normalizeLibraryText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const searchableText = normalizeLibraryText(values.flat().join(' '));
  return words.every((word) => searchableText.includes(word));
}

export function toSupabaseLoosePattern(query: string): string {
  const words = normalizeLibraryText(query).split(/\s+/).filter(Boolean);
  return `%${words.join('%')}%`;
}
