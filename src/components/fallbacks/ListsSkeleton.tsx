import { Skeleton } from './PageSkeleton';
export default function ListsSkeleton() {
  return <div role="status" aria-label="Cargando tus listas…" className="space-y-6">
    <span className="sr-only">Cargando tus listas…</span>
    <Skeleton className="h-44" /><Skeleton className="h-12" />
    <div aria-hidden="true" className="space-y-4 rounded-2xl border border-border p-4">{Array.from({length:5},(_,i) => <div key={i} className="flex items-center gap-4"><Skeleton className="h-20 w-14 shrink-0" /><Skeleton className="h-10 flex-1" /></div>)}</div>
  </div>;
}
