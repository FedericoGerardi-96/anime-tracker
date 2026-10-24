import { Skeleton } from "./PageSkeleton";
import type { HomeSectionSkeletonProps } from "@/interfaces/home";

const TITLES = {
  today: "En emisión hoy",
  upcoming: "Lo que viene en anime",
  recommendations: "También te puede interesar",
  stats: "Mi progreso",
  top: "Top anime de todos los tiempos",
};

export default function HomeSectionSkeleton({ section }: Readonly<HomeSectionSkeletonProps>) {
  const title = TITLES[section];
  if (section === "stats") {
    return (
      <section role="status" aria-label="Cargando estadísticas…" className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-5 text-lg font-bold">{title}</h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1" aria-hidden="true">
          {["Anime", "Manga"].map((type) => (
            <div key={type}>
              <h3 className="mb-4 border-b border-border pb-2 text-sm font-bold">{type}</h3>
              <Skeleton className="mx-auto size-30 rounded-full" />
              <div className="mt-5 space-y-3">
                <Skeleton className="h-4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const grid = section === "top"
    ? "grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10"
    : section === "upcoming"
      ? "gap-3 sm:grid-cols-2"
      : section === "today"
        ? "grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-2 gap-4 sm:grid-cols-4";
  const count = section === "top" ? 10 : section === "upcoming" ? 6 : section === "today" ? 8 : 4;

  return (
    <section role="status" aria-label={`Cargando ${title.toLowerCase()}…`} className={section === "top" ? "border-t border-border pt-10" : undefined}>
      {section === "upcoming" ? (
        <div className="mb-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Próximamente</p>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nuevas temporadas y estrenos anunciados.</p>
        </div>
      ) : section === "today" ? (
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Estrenos y nuevos episodios programados para hoy.</p>
        </div>
      ) : (
        <h2 className="mb-5 text-2xl font-bold tracking-tight">{title}</h2>
      )}
      <div aria-hidden="true" className={`grid ${grid}`}>
        {Array.from({ length: count }, (_, index) => (
          section === "upcoming" ? (
            <div key={index} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <Skeleton className="h-32 w-22 shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <div key={index} className="space-y-3">
              <Skeleton className={section === "recommendations" ? "aspect-video" : section === "today" ? "aspect-3/4" : "aspect-2/3"} />
              <Skeleton className="h-4 w-4/5" />
              {section !== "recommendations" && <Skeleton className="h-3 w-1/2" />}
            </div>
          )
        ))}
      </div>
    </section>
  );
}
