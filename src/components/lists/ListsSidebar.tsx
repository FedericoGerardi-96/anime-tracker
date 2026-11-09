import ListsTabs from './ListsTabs';
import { getListsSidebarData } from '@/services/lists-sidebar';
import type { ListTab } from '@/interfaces/lists';

export default async function ListsSidebar({ activeTab, listId }: { activeTab: ListTab | 'library' | 'friends'; listId?: string }) {
  const data = await getListsSidebarData().catch(() => null);
  return <ListsTabs activeTab={activeTab} listId={listId} counts={data?.counts} lists={data?.lists} unavailable={!data} />;
}
