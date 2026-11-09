import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/services/supabase';
import { cleanListsParams } from '@/lib/lists-toolbar';
import { parseListsOptions } from '@/lib/lists-navigation';
import type { CatalogPageProps } from '@/interfaces/page';
import ListsContent from '@/components/lists/ListsContent';
import ListsTabs from '@/components/lists/ListsTabs';
import ListsSidebar from '@/components/lists/ListsSidebar';
import LibraryContent from '@/components/lists/LibraryContent';
import ListsSkeleton from '@/components/fallbacks/ListsSkeleton';
import FollowedListsContent from '@/components/lists/FollowedListsContent';
export const metadata: Metadata = { title: 'Mis listas', description: 'Administrá tus listas de anime y manga, seguí tu progreso y organizá tus colecciones.' };
export default async function ListsPage({ searchParams }: Readonly<CatalogPageProps>) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);
  if (!user) redirect('/login');
  const incoming = new URLSearchParams();
  Object.entries(params).forEach(([key,value]) => { if (typeof value === 'string') incoming.set(key,value); });
  const clean = cleanListsParams(incoming);
  if (clean.toString() !== incoming.toString()) redirect('/lists?' + clean.toString());

  const options = parseListsOptions(params);
  const library = !params.tab || params.tab === 'library';
  const friends = params.tab === 'friends';
  const activeTab = friends ? 'friends' : library ? 'library' : options.tab;
  const libraryParams = Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  return <div className="grid items-start gap-8 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
    <Suspense fallback={<ListsTabs activeTab={activeTab} />}><ListsSidebar activeTab={activeTab} listId={options.listId} /></Suspense>
    <section aria-label="Contenido de mis listas" className="min-w-0">
      <Suspense fallback={<ListsSkeleton />}>
        {friends ? <FollowedListsContent page={Math.min(options.page, 41667)} />
          : library ? <LibraryContent searchParams={Promise.resolve(libraryParams)} /> : <ListsContent options={options} />}
      </Suspense>
    </section>
  </div>;
}
