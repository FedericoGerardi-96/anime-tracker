import { Skeleton } from './PageSkeleton';
export default function ScheduleSkeleton() {
  return <div role="status" aria-label="Cargando calendario…" className="space-y-8">
    <span className="sr-only">Cargando calendario…</span>
    <div aria-hidden="true" className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6"><Skeleton className="h-8 w-60" /><Skeleton className="mt-3 h-4 w-72 max-w-full" /></div>
      <div className="grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-7 w-40" />
      <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4"><Skeleton className="h-20 w-14 shrink-0" /><div className="flex-1 space-y-3"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}</div>
    </div>
  </div>;
}
