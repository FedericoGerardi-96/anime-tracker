import { Skeleton } from '@/components/fallbacks/PageSkeleton';

export default function ProfileHighlightsLoading() {
  return <main role="status" aria-label="Cargando favoritos destacados…" className="mx-auto w-full max-w-7xl space-y-9 px-5 py-10 sm:px-8">
    <span className="sr-only">Cargando favoritos destacados…</span>
    <Skeleton className="h-4 w-48" />
    <div className="space-y-3"><Skeleton className="h-4 w-44" /><Skeleton className="h-12 w-3/4 max-w-xl" /><Skeleton className="h-5 w-full max-w-2xl" /></div>
    <div className="flex gap-2"><Skeleton className="h-12 w-32" /><Skeleton className="h-12 w-32" /><Skeleton className="h-12 w-32" /></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>
  </main>;
}
