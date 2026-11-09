'use server';

import { getListHeroItems } from '@/services/list-hero';
import { rouletteCandidates, sampleItems } from '@/lib/list-hero';

export async function drawListAnime(tab: string, listId?: string, previousId?: string) {
  try {
    const candidates = rouletteCandidates(await getListHeroItems(tab, listId));
    const pool = candidates.length > 1 ? candidates.filter(item => item.id !== previousId) : candidates;
    const item = sampleItems(pool, 1)[0];
    return item ? { item, count: candidates.length } : { error: 'No quedan anime pendientes o sin estado en esta lista.' };
  } catch {
    return { error: 'No pudimos sortear un anime. Volvé a intentarlo.' };
  }
}
