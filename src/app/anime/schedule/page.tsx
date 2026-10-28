import { Suspense } from 'react';
import ScheduleContent from '@/components/anime/ScheduleContent';
import ScheduleSkeleton from '@/components/fallbacks/ScheduleSkeleton';
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Calendario semanal de anime",
  description: "Calendario semanal de emisiones y estrenos de anime.",
};

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <Link href="/anime" className="hover:text-primary transition-colors">
          Catálogo de anime
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-muted-foreground font-medium">Calendario</span>
      </div>

      <Suspense key={JSON.stringify(params)} fallback={<ScheduleSkeleton />}><ScheduleContent params={params} /></Suspense>
    </div>
  );
}
