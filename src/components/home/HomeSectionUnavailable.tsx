import type { HomeSectionUnavailableProps } from "@/interfaces/home";

export default function HomeSectionUnavailable({ title }: Readonly<HomeSectionUnavailableProps>) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p role="status" className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-muted-foreground">
        No pudimos cargar esta sección. MyAnimeList no está respondiendo en este momento.
        Tu progreso, listas y favoritos siguen disponibles.
      </p>
    </section>
  );
}
