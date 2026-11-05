/** Select without replacement; callers provide a secure random integer generator. */
export function selectRandomWatching<T>(items: readonly T[], limit: number, randomInt: (upperBound: number) => number): T[] {
  const selected = [...items];
  const count = Math.min(Math.max(0, limit), selected.length);
  for (let index = 0; index < count; index++) {
    const chosen = index + randomInt(selected.length - index);
    [selected[index], selected[chosen]] = [selected[chosen], selected[index]];
  }
  return selected.slice(0, count);
}

export function remainingWatchingEpisodes(total: number | null, current: number): number | null {
  if (total === null || !Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(current) || current < 0) return null;
  return Math.max(0, total - current);
}
