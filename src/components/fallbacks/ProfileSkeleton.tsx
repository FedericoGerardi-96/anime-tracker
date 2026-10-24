import { Skeleton } from '@/components/fallbacks/PageSkeleton';

export default function ProfileSkeleton() {
  return <div role="status" aria-label="Cargando perfil…" className="flex-1 space-y-12 p-6 md:p-12">
    <span className="sr-only">Cargando perfil…</span>
    <section className="pt-12 xl:pt-0">
      <div className="flex flex-col items-center gap-8 xl:flex-row xl:items-end">
        <Skeleton className="size-40 shrink-0 rounded-3xl" />
        <div className="w-full min-w-0 flex-1 space-y-3 text-center xl:text-left">
          <Skeleton className="mx-auto h-10 w-52 max-w-full xl:mx-0" />
          <Skeleton className="mx-auto h-4 w-80 max-w-full xl:mx-0" />
          <Skeleton className="mx-auto h-4 w-48 max-w-full xl:mx-0" />
        </div>
        <div className="flex gap-3"><Skeleton className="h-20 w-28 rounded-2xl" /><Skeleton className="h-20 w-28 rounded-2xl" /></div>
      </div>
    </section>
    <section className="space-y-6">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-28 w-full rounded-3xl" />
    </section>
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <section className="space-y-6"><Skeleton className="h-7 w-48" /><div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-3"><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-4 w-3/4" /></div>)}</div></section>
      <section className="space-y-6"><Skeleton className="h-7 w-36" /><div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="aspect-2/3 w-full rounded-xl" />)}</div></section>
    </div>
    <section className="space-y-6"><Skeleton className="h-7 w-40" /><Skeleton className="h-28 w-full max-w-lg rounded-3xl" /><Skeleton className="h-72 w-full max-w-3xl rounded-3xl" /><Skeleton className="h-72 w-full max-w-3xl rounded-3xl" /></section>
  </div>;
}
