import { Skeleton } from './PageSkeleton';
export default function ScheduleSkeleton() {
  return <div role="status" aria-label="Cargando calendario semanal…" className="space-y-8">
    <span className="sr-only">Cargando calendario semanal…</span>
    <div aria-hidden="true" className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6"><Skeleton className="h-8 w-60" /><Skeleton className="mt-3 h-4 w-72 max-w-full" /></div>
      <div className="flex gap-2 overflow-hidden border-b border-border pb-2">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-12 w-32 shrink-0" />)}</div>
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-3"><Skeleton className="aspect-2/3" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-1/2" /></div>)}</div>
    </div>
  </div>;
}
