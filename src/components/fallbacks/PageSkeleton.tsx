import type { SkeletonProps, GridSkeletonProps } from '@/interfaces/loading';

export function Skeleton({ className = '' }: Readonly<SkeletonProps>) {
  return <div aria-hidden="true" className={`rounded-xl bg-muted motion-safe:animate-pulse ${className}`} />;
}

export function GridSkeleton({ count = 12, label = 'Cargando resultados…' }: Readonly<GridSkeletonProps>) {
  return <div role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="aspect-2/3" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-1/2" /></div>)}
    </div>
  </div>;
}

export function CatalogSkeleton() {
  return <div className="space-y-8"><Skeleton className="h-24 md:h-20" /><GridSkeleton /></div>;
}

export function DetailSkeleton() {
  return <div role="status" aria-label="Cargando ficha…" className="mx-auto max-w-7xl space-y-10 px-8 py-8">
    <span className="sr-only">Cargando ficha…</span>
    <Skeleton className="h-4 w-48" />
    <div className="flex flex-col items-end gap-8 lg:flex-row lg:gap-12">
      <Skeleton className="mx-auto aspect-2/3 w-full max-w-[280px] shrink-0 lg:mx-0" />
      <div className="w-full flex-1 space-y-6"><Skeleton className="h-6 w-24" /><Skeleton className="h-16 w-4/5" /><Skeleton className="h-14 w-full" /><Skeleton className="h-12 w-64" /></div>
    </div>
    <Skeleton className="h-64 w-full rounded-3xl" />
  </div>;
}

export function ActionsSkeleton() {
  return <div role="status" aria-label="Cargando tu progreso…" className="flex flex-wrap gap-3"><span className="sr-only">Cargando tu progreso…</span><Skeleton className="h-12 w-44" /><Skeleton className="h-12 w-32" /></div>;
}

export default function PageSkeleton() {
  return <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8"><Skeleton className="h-10 w-60" /><Skeleton className="h-5 w-3/5" /><CatalogSkeleton /></div>;
}
