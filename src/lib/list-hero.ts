export interface HeroItem {
  id: string; malId: number; title: string; image: string; type: string;
  status: string | null; episode: number; total: number | null;
}
export function summarizeList(items: HeroItem[]) {
  const completed = items.filter(item => item.status === 'completed').length;
  const unfinishedAnime = items.filter(item => item.type === 'anime' && item.status !== 'completed');
  return {
    total: items.length, completed, remaining: items.length - completed,
    episodes: unfinishedAnime.reduce((sum, item) => sum + (item.total ? Math.max(0, item.total - Math.max(0, item.episode)) : 0), 0),
    unknown: unfinishedAnime.filter(item => !item.total).length,
  };
}
export function rouletteCandidates(items: HeroItem[]) {
  return items.filter(item => item.type === 'anime' && (!item.status || item.status === 'plan_to_watch'));
}
export function sampleItems<T>(items: T[], count: number, random = Math.random): T[] {
  const pool = [...items];
  const selected: T[] = [];
  while (pool.length && selected.length < count) selected.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return selected;
}
