import { Metadata } from "next";
import { getWeeklySchedules } from "@/lib/jikan-service";
import { getFavoriteMalIds } from "@/lib/actions/media";
import { getAuthenticatedUser } from "@/services/supabase";
import ScheduleCalendar from "@/components/anime/ScheduleCalendar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Weekly Airing Calendar",
  description: "Weekly anime airing calendar. Stay up to date with simulcasts and your favorites.",
};

export default async function SchedulePage() {
  const user = await getAuthenticatedUser();
  
  const [weeklySchedules, favoriteMalIds] = await Promise.all([
    getWeeklySchedules(),
    getFavoriteMalIds(),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-8 lg:p-12 space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <Link href="/anime" className="hover:text-primary transition-colors">
          Anime Library
        </Link>
        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
        <span className="text-slate-300 font-medium">Calendar</span>
      </div>

      <ScheduleCalendar
        weeklySchedules={weeklySchedules}
        favoriteMalIds={favoriteMalIds ?? []}
        userId={user?.id}
      />
    </div>
  );
}
