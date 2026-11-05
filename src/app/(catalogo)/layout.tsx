import { Suspense, type ReactNode } from 'react';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import { Skeleton } from '@/components/fallbacks/PageSkeleton';

export default function CatalogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex-1 space-y-8 py-4 sm:py-8 lg:py-12">
      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <CatalogHeader />
      </Suspense>
      {children}
    </div>
  );
}
