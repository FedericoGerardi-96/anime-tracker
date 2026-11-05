import { Suspense } from "react";
import type { Metadata } from "next";

import HomeWatching from "@/components/home/HomeWatching";
import HomeSchedule from "@/components/home/HomeSchedule";
import HomeUpcoming from "@/components/home/HomeUpcoming";
import HomeStats from "@/components/home/HomeStats";
import HomeTopAnime from "@/components/home/HomeTopAnime";
import HomeReadingSuggestions from '@/components/home/HomeReadingSuggestions';
import HomeSectionSkeleton from "@/components/fallbacks/HomeSectionSkeleton";

export const metadata: Metadata = {
  title: "Inicio | AniTrack",
};

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 py-8 sm:py-10">
      <h1 className="sr-only">Inicio de AniTrack</h1>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-12">
          <Suspense fallback={<HomeSectionSkeleton section="watching" />}>
            <HomeWatching />
          </Suspense>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <Suspense fallback={<div role="status" className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Cargando horarios…</div>}>
            <HomeSchedule />
          </Suspense>
          <Suspense fallback={<HomeSectionSkeleton section="stats" />}>
            <HomeStats />
          </Suspense>
        </aside>
      </div>

      <Suspense fallback={<HomeSectionSkeleton section="upcoming" />}>
        <HomeUpcoming />
      </Suspense>

      <Suspense fallback={null}>
        <HomeReadingSuggestions />
      </Suspense>

      <Suspense fallback={<HomeSectionSkeleton section="top" />}>
        <HomeTopAnime />
      </Suspense>
    </div>
  );
}
