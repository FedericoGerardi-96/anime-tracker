import AnimeCharactersSkeleton from "@/components/fallbacks/AnimeCharactersSkeleton";
import { Skeleton } from "@/components/fallbacks/PageSkeleton";
export default function Loading() {
  return (
    <main className="min-h-screen pb-6">
      <div className="mx-auto max-w-400 p-6 md:p-10">
        <Skeleton className="mb-8 h-4 w-64" />
        <header className="mb-12">
          <h1 className="mb-4 text-4xl font-black tracking-tighter md:text-6xl">
            Personajes
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Reparto consultado en tiempo real desde AniList, con MyAnimeList
            como respaldo.
          </p>
        </header>
        <AnimeCharactersSkeleton />
      </div>
    </main>
  );
}
