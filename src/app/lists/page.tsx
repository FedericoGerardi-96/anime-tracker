import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/services/supabase';
import { parseListsOptions } from '@/lib/lists-navigation';
import type { CatalogPageProps } from '@/interfaces/page';
import ListsContent from '@/components/lists/ListsContent';
import ListsTabs from '@/components/lists/ListsTabs';
import CreateListButton from '@/components/lists/CreateListButton';
import ListsSkeleton from '@/components/fallbacks/ListsSkeleton';
export const metadata: Metadata = { title: 'Mis listas', description: 'Administrá tus listas de anime y manga, seguí tu progreso y organizá tus colecciones.' };
export default async function ListsPage({ searchParams }: Readonly<CatalogPageProps>) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);
  if (!user) redirect('/login');
  const options = parseListsOptions(params);
  return <div className="relative w-full space-y-8 px-4 py-8 sm:px-8 lg:px-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold">Mis listas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Seguí tu progreso y organizá tus colecciones</p>
      </div>{options.tab === 'custom_lists' && !options.listId && <CreateListButton />}
    </header>
    <ListsTabs activeTab={options.tab} />
    <Suspense key={`${options.tab}:${options.listId ?? ""}`} fallback={<ListsSkeleton />}><ListsContent options={options} /></Suspense>
  </div>;
}
