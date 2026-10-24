import { Skeleton } from "./PageSkeleton";
export default function AnimeCharactersSkeleton() {
  return (
    <output aria-label="Cargando reparto del anime…">
      <span className="sr-only">Cargando reparto del anime…</span>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-8 xl:grid-cols-12"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:col-span-8">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-3/4 rounded-2xl" />
          ))}
        </div>
        <div className="xl:col-span-4">
          <div className="space-y-6 rounded-4xl border border-border bg-card p-7">
            <div className="flex gap-4">
              <Skeleton className="size-20 shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-48" />
            <Skeleton className="h-20" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </div>
    </output>
  );
}
