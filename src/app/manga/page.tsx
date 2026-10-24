import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { CatalogPageProps } from '@/interfaces/page';
import MangaCatalogResults from '@/components/catalog/MangaCatalogResults';
import { CatalogSkeleton } from '@/components/fallbacks/PageSkeleton';

export const metadata: Metadata = {
  title: "Catálogo de manga",
  description: "Explorá las colecciones de manga, manhwa y doujin más populares.",
};

export default async function MangaListPage({ searchParams }: Readonly<CatalogPageProps>) {
  const params = await searchParams;
  return <div className="flex-1 space-y-8 p-4 sm:p-8 lg:p-12">
    <h1 className="text-3xl font-black">Catálogo de manga</h1>
    <Suspense fallback={<CatalogSkeleton />}>
      <MangaCatalogResults params={params} />
    </Suspense>
  </div>;
}
