import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DetailPageProps } from "@/interfaces/page";
import AnimeCharactersContent from "@/components/anime/AnimeCharactersContent";
import AnimeCharactersTitle from "@/components/anime/AnimeCharactersTitle";
import AnimeCharactersSkeleton from "@/components/fallbacks/AnimeCharactersSkeleton";

export default async function CharactersPage({
  params,
}: Readonly<DetailPageProps>) {
  const { slug } = await params;
  if (!/^\d+(?:-|$)/.test(slug) || Number.parseInt(slug) < 1) notFound();
  return (
    <main className="min-h-screen pb-6">
      <div className="mx-auto max-w-400 p-6 md:p-10">
        <nav className="mb-8 flex gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <Link href="/anime">Anime</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/anime/${slug}`}>Volver a la ficha</Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">Personajes</span>
        </nav>
        <header className="mb-12">
          <h1 className="mb-4 text-4xl font-black leading-tight tracking-tighter text-white md:text-6xl">
            Personajes —{" "}
            <span className="text-primary">
              <Suspense
                key={slug}
                fallback={
                  <span
                    className="inline-block h-12 w-60 max-w-full rounded-xl bg-muted align-middle motion-safe:animate-pulse"
                    aria-label="Cargando título del anime"
                  />
                }
              >
                <AnimeCharactersTitle slug={slug} />
              </Suspense>
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Reparto consultado en tiempo real desde AniList, con MyAnimeList
            como respaldo.
          </p>
        </header>
        <Suspense key={slug} fallback={<AnimeCharactersSkeleton />}>
          <AnimeCharactersContent slug={slug} />
        </Suspense>
      </div>
    </main>
  );
}
