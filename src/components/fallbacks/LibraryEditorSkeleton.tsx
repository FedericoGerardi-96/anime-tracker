import { Skeleton } from './PageSkeleton';

export default function LibraryEditorSkeleton() {
  return <div role="status" aria-label="Cargando edición…" className="space-y-7">
    <span className="sr-only">Cargando edición…</span>
    <div aria-hidden="true" className="space-y-7">
      <div className="space-y-3"><Skeleton className="h-3 w-20" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({length:5},(_,i) => <Skeleton key={i} className="h-11" />)}</div></div>
      <div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-16" /></div>
      <div className="space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-12" /></div>
      <div className="space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-32" /></div>
      <div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-12" /></div>
      <Skeleton className="h-11 w-3/4" />
    </div>
  </div>;
}
