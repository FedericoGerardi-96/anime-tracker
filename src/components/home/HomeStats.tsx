import Link from "next/link";
import StatsDonut from "@/components/ui/StatsDonut";
import { getProgressStatsByType } from "@/lib/actions/lists";

export default async function HomeStats() {
  const stats = await getProgressStatsByType();
  return (
    stats === null ? (
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/15 to-card p-6">
        <span className="material-symbols-outlined mb-4 text-3xl text-primary">
          monitoring
        </span>
        <h2 className="text-lg font-bold">
          Tu progreso, en un solo lugar
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Iniciá sesión para seguir tus series, sincronizar listas y ver
          tus estadísticas.
        </p>
        <Link
          href="/login"
          className="mt-5 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          Iniciar sesión
        </Link>
      </section>
    ) : (
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
          <span className="material-symbols-outlined text-primary">
            analytics
          </span>
          {""}
          Mi progreso
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <h3 className="mb-4 border-b border-border pb-2 text-sm font-bold">Anime</h3>
            <StatsDonut stats={stats.anime} mediaType="anime" />
          </div>
          <div>
            <h3 className="mb-4 border-b border-border pb-2 text-sm font-bold">Manga</h3>
            <StatsDonut stats={stats.manga} mediaType="manga" />
          </div>
        </div>
      </section>
    )
  );
}
