"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { selectTodayHomeAirings, type PublicHomeAiring } from "@/lib/home-airing";
import { slugify } from "@/lib/utils";
import HomeAiringCover from "./HomeAiringCover";

function AiringRow({ event }: Readonly<{ event: PublicHomeAiring }>) {
  const time = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(event.airingAt * 1000);
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 border-b border-border py-3">
      <time dateTime={new Date(event.airingAt * 1000).toISOString()} className="text-xs tabular-nums text-muted-foreground">{time}</time>
      <div className="flex min-w-0 items-start gap-3">
        <HomeAiringCover src={event.coverImage} />
        <div className="min-w-0">
          {event.malId ? <Link href={`/anime/${event.malId}-${slugify(event.title)}`} className="block break-words text-sm font-bold hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{event.title}</Link> : <span className="block break-words text-sm font-bold">{event.title}</span>}
          <p className="mt-0.5 text-xs text-muted-foreground">Episodio {event.episode}</p>
        </div>
      </div>
    </li>
  );
}

export default function HomePublicToday({ events, incomplete, start, end }: Readonly<{ events: PublicHomeAiring[]; incomplete: boolean; start: number; end: number }>) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) return <p role="status" className="text-sm text-muted-foreground">Cargando horarios…</p>;
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  if (dayStart.getTime() < start * 1000 || dayEnd.getTime() > end * 1000) return <p role="status" className="text-sm text-muted-foreground">Actualizá la página para ver los horarios de hoy.</p>;

  const { before, after } = selectTodayHomeAirings(events, now);
  const clock = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  return (
    <>
      {before.length === 0 && after.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No encontramos horarios para hoy.</p>}
      <ul aria-label="Emisiones programadas antes de ahora">{before.map((event) => <AiringRow key={event.id} event={event} />)}</ul>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 py-3 text-xs font-bold text-primary" aria-label={`Ahora, ${clock}`}>
        <span className="tabular-nums">{clock}</span>
        <span className="flex items-center gap-2"><span className="h-0.5 flex-1 rounded-full bg-primary" aria-hidden="true" />Ahora</span>
      </div>
      <ul aria-label="Emisiones programadas después de ahora">{after.map((event) => <AiringRow key={event.id} event={event} />)}</ul>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Horarios previstos; las emisiones anteriores pueden estar incompletas.{incomplete ? " La lista disponible es parcial." : ""}</p>
    </>
  );
}
