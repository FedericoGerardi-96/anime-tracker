import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { CatalogPageProps } from '@/interfaces/page';
import AnimeCatalogResults from '@/components/catalog/AnimeCatalogResults';
import { CatalogSkeleton } from '@/components/fallbacks/PageSkeleton';

export const metadata: Metadata = {
  title: "Catálogo de anime",
  description: "Explorá y filtrá las series de anime más recientes y populares.",
};

export default async function AnimeListPage({ searchParams }: Readonly<CatalogPageProps>) {
  const params = await searchParams;
  return <div className="flex-1 space-y-8 p-4 sm:p-8 lg:p-12">
    <h1 className="text-3xl font-black">Catálogo de anime</h1>
    <Suspense fallback={<CatalogSkeleton />}>
      <AnimeCatalogResults params={params} />
    </Suspense>
  </div>;
}
