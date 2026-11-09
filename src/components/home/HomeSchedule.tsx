import Link from "next/link";
import { getHomeWatching } from "@/services/home-watching";
import { getHomePublicSchedule } from "@/services/home-public-schedule";
import { getHomePersonalSchedule } from "@/services/home-personal-schedule";
import HomeScheduleTimes from "./HomeScheduleTimes";
import HomePublicToday from "./HomePublicToday";

export default async function HomeSchedule() {
  const { signedIn } = await getHomeWatching();
  if (!signedIn) {
    let schedule: Awaited<ReturnType<typeof getHomePublicSchedule>> | null = null;
    try {
      schedule = await getHomePublicSchedule();
    } catch {
      // El panel conserva su enlace al calendario si el proveedor falla.
    }
    return (
      <section aria-labelledby="home-schedule-title" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="home-schedule-title" className="text-lg font-bold">Hoy</h2>
        <p className="mt-1 text-xs text-muted-foreground">Hora local · emisiones de anime</p>
        <div className="mt-4">{schedule ? <HomePublicToday {...schedule} /> : <p role="status" className="text-sm text-muted-foreground">No pudimos cargar los horarios. Probá de nuevo más tarde.</p>}</div>
        <Link href="/anime/schedule" className="mt-4 inline-block text-sm font-semibold text-primary  ">Abrir calendario</Link>
      </section>
    );
  }
  let personal: Awaited<ReturnType<typeof getHomePersonalSchedule>> | null = null;
  try {
    personal = await getHomePersonalSchedule();
  } catch {
    // Mantener disponible el enlace al calendario si falla la biblioteca.
  }
  return (
    <section aria-labelledby="home-schedule-title" className="rounded-2xl border border-border bg-card p-5">
      {personal ? <HomeScheduleTimes {...personal} /> : <>
        <h2 id="home-schedule-title" className="text-lg font-bold">Próximas emisiones</h2>
        <p role="status" className="mt-4 text-sm text-muted-foreground">No pudimos cargar los horarios. Probá de nuevo más tarde.</p>
      </>}
      <Link href="/anime/schedule" className="mt-4 inline-block text-sm font-semibold text-primary  ">Abrir calendario</Link>
    </section>
  );
}
