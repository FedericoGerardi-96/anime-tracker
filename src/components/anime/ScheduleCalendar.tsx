'use client';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeAiringCover from '@/components/home/HomeAiringCover';
import { localDay, shiftDay, type CalendarEvent, type CalendarLibrary } from '@/lib/calendar-week';
import { SCHEDULE_SEASONS } from '@/lib/schedule-filters';
import { slugify } from '@/lib/utils';
import { updatePersonalProgress } from '@/lib/actions/lists';

const segment =
  'min-h-11 rounded-lg px-3 text-sm cursor-pointer font-semibold text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground disabled:cursor-not-allowed';
const statusNames: Record<string, string> = {
  watching: 'Viendo',
  plan_to_watch: 'Pendiente',
  on_hold: 'En pausa',
};
const button =
  'min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted aria-pressed:bg-accent aria-pressed:ring-1 aria-pressed:ring-primary';
interface Props {
  week: string;
  year: number;
  season: string;
  years: number[];
  zone: string;
  now: number;
  automatic: boolean;
  events: CalendarEvent[];
  library: CalendarLibrary[];
  signedIn: boolean;
  followed: boolean;
  seasonal: boolean;
  warnings: string[];
  children: ReactNode;
}
export default function ScheduleCalendar(p: Props) {
  const router = useRouter(),
    params = useSearchParams();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(p.now),
    [selected, setSelected] = useState<string>(),
    [message, setMessage] = useState('');
  const today = localDay(now, p.zone);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(p.week, i));
  const active = selected && days.includes(selected) ? selected : days.includes(today) ? today : p.week;
  const time = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: p.zone,
  });
  const label = (day: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-AR', { ...opts, timeZone: 'UTC' }).format(new Date(day + 'T12:00Z'));
  useEffect(() => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      p.automatic &&
      device &&
      device !== p.zone &&
      !document.cookie.split('; ').includes('calendar-device-zone=' + encodeURIComponent(device))
    ) {
      document.cookie =
        'calendar-device-zone=' + encodeURIComponent(device) + '; Path=/; Max-Age=31536000; SameSite=Lax';
      router.refresh();
    }
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [p.automatic, p.zone, router]);
  const go = (changes: Record<string, string | null>) => {
    const query = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes))
      if (v) query.set(k, v);
      else query.delete(k);
    start(() => router.replace('/anime/schedule?' + query, { scroll: false }));
  };
  const move = (day: string) =>
    go({
      week: day,
      year: day.slice(0, 4),
      season: SCHEDULE_SEASONS[Math.floor((Number(day.slice(5, 7)) - 1) / 3)].value,
      view: null,
    });
  const library = new Map(p.library.map((item) => [item.malId, item]));
  const visible = p.events.filter((e) => !p.followed || (e.malId !== null && library.has(e.malId)));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of visible) {
    const day = localDay(event.at, p.zone);
    const entries = byDay.get(day) ?? [];
    entries.push(event);
    byDay.set(day, entries);
  }
  const next = visible.find((e) => e.at > now && (!p.signedIn || library.has(e.malId ?? -1)));
  const seasonLabel = SCHEDULE_SEASONS.find((s) => s.value === p.season)?.label;
  const progress = (item: CalendarLibrary) =>
    start(async () => {
      try {
        const result = await updatePersonalProgress({
          mediaId: item.id,
          malId: item.malId,
          mediaType: 'anime',
          status: 'watching',
          currentEpisode: item.progress + 1,
          previous: { episode: item.progress, status: item.status },
        });
        setMessage(result.error || 'Episodio guardado en AniTrack.');
        if (!result.error) router.refresh();
      } catch {
        setMessage('No pudimos guardar el episodio. Volvé a intentarlo.');
      }
    });
  const eventCard = (e: CalendarEvent) => {
    const item = library.get(e.malId ?? -1);
    const href = e.malId ? `/anime/${e.malId}-${slugify(e.title)}` : '/anime/emision/' + e.key;
    return (
      <article
        key={e.key}
        className="group relative rounded-xl border border-border border-l-4 bg-card p-2"
        style={{
          borderLeftColor:
            item?.status === 'on_hold'
              ? '#bb8423'
              : item?.status === 'plan_to_watch'
                ? '#528ec0'
                : item
                  ? 'var(--brand-mint)'
                  : 'var(--border)',
        }}
      >
        <div className="flex items-start gap-2">
          <HomeAiringCover src={e.cover} />
          <div className="min-w-0">
            <time
              dateTime={new Date(e.at).toISOString()}
              className="font-mono text-xs font-bold text-[var(--brand-aurora)]"
            >
              {time.format(e.at)}
            </time>
            <div title={e.title} className="line-clamp-3 break-words text-[13px] font-bold leading-tight">
              <Link
                prefetch={false}
                href={href}
                className="after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:text-primary"
              >
                {e.title}
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {e.episode ? 'EP ' + e.episode : 'Horario habitual'}
          {item ? ' · ' + statusNames[item.status] : ''}
          {item && e.episode && item.progress >= e.episode ? ' · visto' : ''}
        </p>
        {item && e.episode === item.progress + 1 && e.at <= now && (
          <button
            disabled={pending}
            onClick={() => progress(item)}
            className="relative z-10 mt-2 min-h-11 rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground"
          >
            Marcar visto
          </button>
        )}
      </article>
    );
  };
  return (
    <section className="min-w-0 space-y-5" aria-busy={pending}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            {seasonLabel} {p.year} · {label(p.week, { day: 'numeric', month: 'short' })} al{' '}
            {label(days[6], { day: 'numeric', month: 'short' })}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold">Calendario</h1>
        </div>
        {!p.seasonal && (
          <aside className="flex max-w-full items-center gap-3 rounded-2xl border bg-card p-4">
            <HomeAiringCover src={next?.cover ?? null} />
            <div>
              <p className="text-xs font-semibold uppercase text-primary">
                Próximo episodio{p.signedIn ? ' de tu biblioteca' : ''}
              </p>
              <strong>{next ? next.title : 'Sin emisiones próximas en esta semana'}</strong>
              {next && (
                <p className="text-sm text-muted-foreground">
                  {next.episode ? 'EP ' + next.episode + ' · ' : ''}
                  {time.format(next.at)} · en {Math.floor((next.at - now) / 3600000)} h{' '}
                  {Math.floor((next.at - now) / 60000) % 60} min
                </p>
              )}
            </div>
          </aside>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Qué mostrar"
          className="inline-flex rounded-xl border border-border bg-card p-1"
        >
          <button
            className={segment}
            disabled={!p.signedIn}
            title={!p.signedIn ? 'Iniciá sesión para ver tu biblioteca' : undefined}
            aria-pressed={p.followed}
            onClick={() => go({ mode: 'followed' })}
          >
            Lo que sigo
          </button>
          <button className={segment} aria-pressed={!p.followed} onClick={() => go({ mode: 'all' })}>
            Toda la temporada
          </button>
        </div>
        <div role="group" aria-label="Navegar por semanas" className="flex items-center gap-1">
          <button
            aria-label="Semana anterior"
            className={button}
            onClick={() => move(shiftDay(p.week, -7))}
          >
            ←
          </button>
          <button className={button} onClick={() => move(today)}>
            Esta semana
          </button>
          <button
            aria-label="Semana siguiente"
            className={button}
            onClick={() => move(shiftDay(p.week, 7))}
          >
            →
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="text-sm text-muted-foreground">
            Horarios en hora de {p.zone.split('/').at(-1)?.replaceAll('_', ' ')} (
            {
              new Intl.DateTimeFormat('es-AR', { timeZone: p.zone, timeZoneName: 'shortOffset' })
                .formatToParts(now)
                .find((part) => part.type === 'timeZoneName')?.value
            }
            )
          </span>
          {p.signedIn && (
            <Link href="/profile#zona-horaria" className="text-sm text-primary underline">
              Ajustar hora
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Año{' '}
          <select
            className={button}
            value={p.year}
            onChange={(e) => go({ year: e.target.value, season: p.season, week: null, view: 'season' })}
          >
            {p.years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Temporada{' '}
          <select
            className={button}
            value={p.season}
            onChange={(e) =>
              go({ year: String(p.year), season: e.target.value, week: null, view: 'season' })
            }
          >
            {SCHEDULE_SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className={button} onClick={() => go({ view: p.seasonal ? null : 'season' })}>
          {p.seasonal ? 'Ver semana' : 'Ver catálogo de temporada'}
        </button>
      </div>
      {p.warnings.length > 0 && (
        <p role="status" className="rounded-xl border bg-card p-3 text-sm">
          Datos incompletos de {p.warnings.join(', ')}. Podés volver a intentar más tarde.
        </p>
      )}
      <p role="status" className="text-sm">
        {message}
      </p>
      {p.seasonal ? (
        p.children
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 xl:hidden" aria-label="Día de la semana">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelected(day)}
                aria-pressed={active === day}
                className="min-h-11 rounded-lg border bg-card text-xs aria-pressed:bg-accent"
              >
                {label(day, { weekday: 'short' })}
                <br />
                {day.slice(-2)}
              </button>
            ))}
          </div>
          <div className="grid gap-1 xl:grid-cols-7">
            {days.map((day) => {
              const entries = byDay.get(day) ?? [];
              const line =
                day === today ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    {time.format(now)}
                    <span className="h-px flex-1 bg-primary" />
                  </div>
                ) : null;
              return (
                <section
                  key={day}
                  aria-label={label(day, { weekday: 'long', day: 'numeric' })}
                  className={`${day === active ? 'flex' : 'hidden'} xl:flex min-w-0 flex-col gap-2 self-start rounded-2xl px-1 py-3.5 xl:min-h-96 ${day === today ? 'bg-linear-to-b from-primary/10 to-transparent' : ''}`}
                >
                  <h2
                    className={`flex justify-between border-b pb-2 text-sm font-bold capitalize ${day === today ? 'text-primary' : ''}`}
                  >
                    {label(day, { weekday: 'short' })}
                    {day === today ? ' · Hoy' : ''}
                    <span
                      className={`font-mono text-xs font-medium ${day === today ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {day.slice(-2)}
                    </span>
                  </h2>
                  {entries.filter((e) => day !== today || e.at <= now).map(eventCard)}
                  {line}
                  {day === today && entries.filter((e) => e.at > now).map(eventCard)}
                  {!entries.length && (
                    <p className="text-xs text-muted-foreground">Sin emisiones anunciadas.</p>
                  )}
                </section>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            🟢 Viendo · 🔵 Pendiente · 🟠 En pausa. Lo que sigo incluye estos estados de tu biblioteca.
            Los horarios habituales de MAL son orientativos. Datos de AniList, MAL y{' '}
            <a href="https://www.tvmaze.com/" className="underline">
              TVmaze
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}
