"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatHomeAiringTime,
  selectPersonalHomeSchedule,
  type PersonalNextAiring,
  type PublicHomeAiring,
} from "@/lib/home-airing";
import { slugify } from "@/lib/utils";
import HomeAiringCover from "./HomeAiringCover";

type Schedule = {
  events: PublicHomeAiring[];
  incomplete: boolean;
  start: number;
  end: number;
};

export default function HomeScheduleTimes({
  schedule,
  next,
  nextUnavailable,
  empty,
}: Readonly<{
  schedule: Schedule | null;
  next: PersonalNextAiring[];
  nextUnavailable: boolean;
  empty: boolean;
}>) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selected =
    now === null
      ? null
      : selectPersonalHomeSchedule(schedule?.events ?? [], next, now);
  const validWindow =
    schedule &&
    selected &&
    selected.start >= schedule.start * 1000 &&
    selected.end <= schedule.end * 1000;
  const today = validWindow ? selected.today : [];
  const canFallback = validWindow && !schedule.incomplete && !nextUnavailable;
  return (
    <>
      <h2 id="home-schedule-title" className="text-lg font-bold">
        {today.length ? "Hoy" : "Próximas emisiones"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Hora local · tu biblioteca
      </p>
      <div className="mt-4">
        {empty ? (
          <p className="text-sm text-muted-foreground">
            Agregá anime a tu biblioteca para consultar sus horarios.
          </p>
        ) : now === null ? (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando horarios…
          </p>
        ) : !schedule ? (
          <p role="status" className="text-sm text-muted-foreground">
            No pudimos cargar los horarios. Probá de nuevo más tarde.
          </p>
        ) : !validWindow ? (
          <p role="status" className="text-sm text-muted-foreground">
            Actualizá la página para ver los horarios de hoy.
          </p>
        ) : today.length ? (
          <>
            <ul className="divide-y divide-border">
              {today.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <HomeAiringCover src={event.coverImage} />
                  <div className="min-w-0">
                    <time
                      dateTime={new Date(event.airingAt * 1000).toISOString()}
                      className="text-xs font-semibold text-primary"
                    >
                      {formatHomeAiringTime(event.airingAt)}
                    </time>
                    <Link
                      href={`/anime/${event.malId}-${slugify(event.title)}`}
                      className="mt-1 block wrap-break-word text-sm font-bold hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Episodio {event.episode}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : !canFallback ? (
          <p role="status" className="text-sm text-muted-foreground">
            No pudimos consultar todos los horarios. Probá de nuevo más tarde.
          </p>
        ) : selected.next ? (
          <div className="flex items-start gap-3">
            <HomeAiringCover src={selected.next.coverImage} />
            <div className="min-w-0">
              <time
                dateTime={new Date(selected.next.airingAt * 1000).toISOString()}
                className="text-xs font-semibold text-primary"
              >
                {formatHomeAiringTime(selected.next.airingAt)}
              </time>
              <Link
                href={`/anime/${selected.next.id}-${slugify(selected.next.title)}`}
                className="mt-1 block break-words text-sm font-bold hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {selected.next.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Episodio {selected.next.episode}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No encontramos próximos horarios para tus series de esta temporada.
          </p>
        )}
      </div>
    </>
  );
}
