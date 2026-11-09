import { Suspense } from 'react';
import ScheduleContent from '@/components/anime/ScheduleContent';
import ScheduleSkeleton from '@/components/fallbacks/ScheduleSkeleton';
import { Metadata } from "next";


export const metadata: Metadata = {
  title: "Calendario semanal de anime",
  description: "Calendario semanal de emisiones y estrenos de anime.",
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <div className="space-y-6 py-8">
      <Suspense fallback={<ScheduleSkeleton />}><ScheduleContent params={params} /></Suspense>
    </div>
  );
}
