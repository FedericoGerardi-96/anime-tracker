import { Metadata } from "next";
import { getMalWeeklySchedule } from "@/lib/myanimelist-service";
import { getFavoriteMalIds } from "@/lib/actions/media";
import { getAuthenticatedUser } from "@/services/supabase";
import ScheduleCalendar from "@/components/anime/ScheduleCalendar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Calendario semanal de anime",
  description: "Calendario semanal de emisiones y estrenos de anime.",
};

export default async function SchedulePage() {
  const user = await getAuthenticatedUser();
  
  const [weeklySchedules, favoriteMalIds] = await Promise.all([
    getMalWeeklySchedule(),
    getFavoriteMalIds(),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <Link href="/anime" className="hover:text-primary transition-colors">
          Catálogo de anime
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-slate-300 font-medium">Calendario</span>
      </div>

      <ScheduleCalendar
        weeklySchedules={weeklySchedules}
        favoriteMalIds={favoriteMalIds ?? []}
        userId={user?.id}
      />
    </div>
  );
}
