import { getListHeroItems } from '@/services/list-hero';
import { rouletteCandidates, sampleItems, summarizeList } from '@/lib/list-hero';
import ListHeroClient from './ListHeroClient';
import ShareListButton from './ShareListButton';
import { getOwnedListShareSettings } from '@/services/list-sharing';

export default async function ListHero({ tab, listId, title, description }: { tab: string; listId?: string; title: string; description?: string | null }) {
  const sharedListId = tab === 'custom_lists' ? listId : undefined;
  const [items, settings] = await Promise.all([
    getListHeroItems(tab, listId),
    sharedListId ? getOwnedListShareSettings(sharedListId) : null,
  ]);
  return <ListHeroClient key={listId ?? tab} tab={tab} listId={listId} title={title} description={description}
    covers={sampleItems(items.filter(item => item.image), 3)} summary={summarizeList(items)}
    candidates={rouletteCandidates(items).length}
    shareControl={sharedListId ? <ShareListButton listId={sharedListId} initialSettings={settings} /> : null} />;
}
