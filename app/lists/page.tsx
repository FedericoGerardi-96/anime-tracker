import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getMediaByProgressStatus, getLists } from '@/lib/actions/lists';
import ListsContent from './_components/ListsContent';

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
    <div className='flex-1 w-full relative px-6 md:px-12 pb-12 space-y-8 pt-24 md:pt-[104px] lg:pt-28 max-w-7xl mx-auto min-h-[101vh]'>
      <ListsContent
        initialUser={user ? { id: user.id } : null}
        initialMediaItems={initialMediaItems}
        initialCustomLists={initialCustomLists || []}
      />
    </div>
  );
}
