import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

import { getMediaByProgressStatus, getLists } from '@/lib/actions/lists';
import ListsContent from '@/components/lists/ListsContent';

export const metadata: Metadata = {
  title: 'My Lists',
  description: 'Manage your anime and manga lists, track progress, and organize custom collections.',
};

export default async function ListsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pre-fetch initial data server-side for instant rendering
  const initialMediaItems = user ? await getMediaByProgressStatus('watching') : [];
  const { data: initialCustomLists } = user ? await getLists() : { data: [] };

  return (
    <div className='flex-1 w-full relative px-6 md:px-12 pb-6 space-y-8 max-w-7xl mx-auto'>
      <ListsContent
        initialUser={user ? { id: user.id } : null}
        initialMediaItems={initialMediaItems}
        initialCustomLists={initialCustomLists || []}
      />
    </div>
  );
}
