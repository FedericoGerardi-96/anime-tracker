import { Suspense } from "react";
import type { Metadata } from "next";

import HomeAiringToday from "@/components/home/HomeAiringToday";
import HomeUpcoming from "@/components/home/HomeUpcoming";
import HomeRecommendations from "@/components/home/HomeRecommendations";
import HomeStats from "@/components/home/HomeStats";
import HomeQuickLinks from "@/components/home/HomeQuickLinks";
import HomeTopAnime from "@/components/home/HomeTopAnime";
import HomeReadingSuggestions from '@/components/home/HomeReadingSuggestions';
import HomeSectionSkeleton from "@/components/fallbacks/HomeSectionSkeleton";

export const metadata: Metadata = {
  title: "Inicio | AniTrack",
};

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="sr-only">Inicio de AniTrack</h1>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-12">
          <Suspense fallback={<HomeSectionSkeleton section="today" />}>
            <HomeAiringToday />
          </Suspense>
          <Suspense fallback={<HomeSectionSkeleton section="upcoming" />}>
            <HomeUpcoming />
          </Suspense>
          <Suspense fallback={<HomeSectionSkeleton section="recommendations" />}>
            <HomeRecommendations />
          </Suspense>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <Suspense fallback={<HomeSectionSkeleton section="stats" />}>
            <HomeStats />
          </Suspense>
          <HomeQuickLinks />
        </aside>
      </div>

      <Suspense fallback={null}>
        <HomeReadingSuggestions />
      </Suspense>

      <Suspense fallback={<HomeSectionSkeleton section="top" />}>
        <HomeTopAnime />
      </Suspense>
    </div>
  );
}
