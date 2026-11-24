import ListsTabs from './ListsTabs';
import { getListsSidebarData } from '@/services/lists-sidebar';
import { getUserProfile } from '@/services/profile';
import { getAuthenticatedUser } from '@/services/supabase';
import type { ListTab } from '@/interfaces/lists';

export default async function ListsSidebar({ activeTab, listId }: { activeTab: ListTab | 'library' | 'friends'; listId?: string }) {
  const user = await getAuthenticatedUser();
  const [data, profile] = await Promise.all([
    getListsSidebarData().catch(() => null),
    user ? getUserProfile(user.id) : null,
  ]);
  return <ListsTabs activeTab={activeTab} listId={listId} counts={data?.counts} lists={data?.lists}
    unavailable={!data} showHentai={profile?.show_h_content === true} />;
}
