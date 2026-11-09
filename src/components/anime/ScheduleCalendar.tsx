'use client';
import { useEffect, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { JetBrains_Mono, Unbounded } from 'next/font/google';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeAiringCover from '@/components/home/HomeAiringCover';
import { localDay, shiftDay, selectNextCalendarEvent, type CalendarEvent, type CalendarLibrary } from '@/lib/calendar-week';
import { SCHEDULE_SEASONS } from '@/lib/schedule-filters';
import { slugify } from '@/lib/utils';
import { updatePersonalProgress } from '@/lib/actions/lists';
import styles from './ScheduleCalendar.module.css';

const calendarMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], display: 'swap' });
const calendarDisplay = Unbounded({ subsets: ['latin'], weight: '700', display: 'swap' });
const eyebrow = `${calendarMono.className} text-[11px] uppercase tracking-[0.14em] text-primary`;

const segment =
  'min-h-11 rounded-lg px-3 text-sm cursor-pointer font-semibold text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground disabled:cursor-not-allowed';
const statusNames: Record<string, string> = {
  watching: 'Viendo',
  plan_to_watch: 'Pendiente',
  on_hold: 'En pausa',
  dropped: 'Abandonado',
  completed: 'Completado',
};
const statusColors: Record<string, string> = {
  watching: 'var(--status-viendo)',
  plan_to_watch: 'var(--status-pendiente)',
  on_hold: 'var(--status-pausa)',
  dropped: 'var(--status-abandonado)',
};
const followedStatuses = new Set(['watching', 'plan_to_watch', 'on_hold']);
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
  nextEvents: CalendarEvent[];
  nextUnavailable: boolean;
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
  const [navigating, navigate] = useTransition();
  const [now, setNow] = useState(p.now),
    [message, setMessage] = useState('');
  const selected = params.get('day');
  const weekly = params.get('layout') === 'week';
  // Presentation changes reuse the loaded week instead of requesting providers again.
  const present = (changes: Record<string, string>) => {
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) query.set(key, value);
    window.history.pushState(null, '', '?' + query);
  };
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
    navigate(() => router.push('/anime/schedule?' + query, { scroll: false }));
  };
  const move = (day: string) =>
    go({
      week: day,
      year: day.slice(0, 4),
      season: SCHEDULE_SEASONS[Math.floor((Number(day.slice(5, 7)) - 1) / 3)].value,
      view: null,
      day: null,
    });
  const library = new Map(p.library.map((item) => [item.malId, item]));
  const visible = p.events.filter((e) => !p.followed || (e.malId !== null && followedStatuses.has(library.get(e.malId)?.status ?? '')));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of visible) {
    const day = localDay(event.at, p.zone);
    const entries = byDay.get(day) ?? [];
    entries.push(event);
    byDay.set(day, entries);
  }
  const next = p.nextUnavailable ? null : selectNextCalendarEvent(p.nextEvents, now);
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
  const eventCard = (e: CalendarEvent, compact = false) => {
    const item = library.get(e.malId ?? -1);
    const href = e.malId ? `/anime/${e.malId}-${slugify(e.title)}` : '/anime/emision/' + e.key;
    return (
      <article
        key={e.key}
        className={`group relative rounded-xl border border-border border-l-[5px] bg-card ${compact ? 'p-2' : 'flex flex-wrap items-center gap-3 p-4 sm:gap-5 sm:px-5'}`}
        style={{
          borderLeftColor: item ? statusColors[item.status] ?? 'var(--border)' : 'var(--border)',
        }}
      >
        {!compact && (
          <time dateTime={new Date(e.at).toISOString()} className="hidden w-14 shrink-0 font-mono text-sm font-bold text-[var(--brand-aurora)] sm:block">
            {time.format(e.at)}
          </time>
        )}
        <div className={`flex min-w-0 items-start ${compact ? 'gap-2' : 'flex-1 items-center gap-4'}`}>
          <HomeAiringCover src={e.cover} size={compact ? 'small' : 'medium'} />
          <div className="min-w-0">
            <time
              dateTime={new Date(e.at).toISOString()}
              className={`font-mono text-xs font-bold text-[var(--brand-aurora)] ${compact ? '' : 'sm:hidden'}`}
            >
              {time.format(e.at)}
            </time>
            <div title={e.title} className={compact ? 'line-clamp-3 break-words text-[13px] font-bold leading-tight' : 'break-words text-[15px] font-bold leading-snug sm:text-base'}>
              <Link
                prefetch={false}
                href={href}
                className="after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:text-primary"
              >
                {e.title}
              </Link>
            </div>
            {!compact && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span>{e.episode ? `Episodio ${e.episode}` : 'Episodio sin confirmar'}</span>
                <span aria-hidden="true">·</span>
                <span>{e.source === 'MAL' ? 'Horario estimado' : e.at <= now ? 'Emitido' : `En ${Math.floor((e.at - now) / 3600000)} h ${Math.floor((e.at - now) / 60000) % 60} min`}</span>
                {item && <span>· {statusNames[item.status]}{e.episode && item.progress >= e.episode ? ' · Visto' : ''}</span>}
              </p>
            )}
          </div>
        </div>
        {compact && <p className="mt-2 text-xs text-muted-foreground">
          {e.episode ? 'EP ' + e.episode : 'Horario habitual'}
          {item ? ' · ' + statusNames[item.status] : ''}
          {item && e.episode && item.progress >= e.episode ? ' · visto' : ''}
        </p>}
        {item && followedStatuses.has(item.status) && e.episode === item.progress + 1 && e.at <= now && (
          <button
            disabled={pending}
            onClick={() => progress(item)}
            className="relative z-10 min-h-11 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
            aria-label={`Marcar visto el episodio ${e.episode} de ${e.title}`}
          >
            Marcar visto
          </button>
        )}
      </article>
    );
  };
  return (
    <section className={`${styles.calendar} min-w-0 space-y-5`} aria-busy={pending || navigating}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>
            {seasonLabel} {p.year} · semana del {label(p.week, { day: 'numeric', month: 'short' })} al{' '}
            {label(days[6], { day: 'numeric', month: 'short' })}
          </p>
          <h1 className={`${calendarDisplay.className} mt-2 text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-[44px]`}>Calendario</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu semana de anime, un episodio a la vez.</p>
        </div>
        {(
          <aside className="flex w-full items-center gap-3 rounded-3xl border bg-card p-4 sm:max-w-[460px] sm:gap-4 sm:px-5">
            <HomeAiringCover src={next?.cover ?? null} size="medium" />
            <div className="min-w-0 flex-1">
              <p className={eyebrow}>
                Próximo episodio{p.followed ? ' de tu biblioteca' : ''}
              </p>
              <strong className="mt-1 block text-sm leading-snug">{next ? next.title : p.nextUnavailable ? 'No pudimos consultar la próxima emisión' : p.nextEvents.length ? 'Actualizá los próximos horarios' : p.followed ? 'Sin próxima emisión anunciada en lo que seguís' : 'Sin próxima emisión anunciada'}{next?.episode ? ` · EP ${next.episode}` : ''}</strong>
              {!next && <button type="button" disabled={navigating} onClick={() => navigate(() => router.refresh())} className="mt-2 min-h-11 cursor-pointer text-sm text-primary underline">Actualizar horarios</button>}
              {next && (
                <p className="text-sm text-muted-foreground">
                  {localDay(next.at, p.zone) === today ? 'Hoy' : localDay(next.at, p.zone) === shiftDay(today, 1) ? 'Mañana' : label(localDay(next.at, p.zone), { day: 'numeric', month: 'short', year: 'numeric' })} a las {time.format(next.at)}
                </p>
              )}
            </div>
            {next && (
              <div className="shrink-0 text-right" aria-label={`Faltan ${Math.floor((next.at - now) / 3600000)} horas y ${Math.floor((next.at - now) / 60000) % 60} minutos`}>
                <div aria-hidden="true" className={`${calendarMono.className} text-2xl tabular-nums text-primary sm:text-[28px]`}>
                  {Math.floor((next.at - now) / 3600000)}:{String(Math.floor((next.at - now) / 60000) % 60).padStart(2, '0')}
                </div>
                <div aria-hidden="true" className="mt-1 text-xs text-muted-foreground">h : min</div>
              </div>
            )}
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
            Todas las emisiones
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
          <Link href="/settings/preferences#zona-horaria" className="inline-flex min-h-11 items-center text-sm text-primary underline">
            Ajustar hora
          </Link>
        </div>
      </div>
      <details className="rounded-xl border bg-card px-4 py-3" open={p.seasonal || undefined}>
        <summary className="cursor-pointer text-sm font-semibold">Explorar temporada · {seasonLabel} {p.year}</summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
      </details>
      {p.warnings.length > 0 && (
        <p role="status" className="rounded-xl border bg-card p-3 text-sm">
          Datos incompletos de {p.warnings.join(', ')}. Podés volver a intentar más tarde.
        </p>
      )}
      <p role="status" className="text-sm empty:hidden">
        {message}
      </p>
      {navigating && <p role="status" className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">Actualizando calendario…</p>}
      <div className={`space-y-5 ${navigating ? 'opacity-50' : ''}`} inert={navigating}>
      {p.seasonal ? (
        p.children
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-muted-foreground">{visible.length} emisiones en la semana</p>
            <div role="group" aria-label="Vista del calendario" className="hidden rounded-xl border bg-card p-1 xl:inline-flex">
              <button className={segment} aria-pressed={!weekly} onClick={() => present({ layout: 'day' })}>Día</button>
              <button className={segment} aria-pressed={weekly} onClick={() => present({ layout: 'week' })}>Semana</button>
            </div>
          </div>
          <div className={`grid grid-cols-7 gap-1 sm:gap-2 ${weekly ? 'xl:hidden' : ''}`} role="group" aria-label="Día de la semana">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => present({ day })}
                aria-pressed={active === day}
                aria-label={`${label(day, { weekday: 'long', day: 'numeric', month: 'long' })}${day === today ? ', hoy' : ''}, ${byDay.get(day)?.length ?? 0} emisiones`}
                className="relative min-h-24 min-w-0 cursor-pointer rounded-xl border bg-card py-3 text-xs hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:ring-1 aria-pressed:ring-primary sm:min-h-28"
              >
                <span className={`block capitalize ${day === today ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  <span className="lg:hidden">{label(day, { weekday: 'short' })}</span>
                  <span className="hidden lg:inline">{label(day, { weekday: 'long' })}</span>
                </span>
                <span className="my-1 block text-lg font-bold sm:text-2xl">{Number(day.slice(-2))}</span>
                <span className="block text-[11px] text-muted-foreground">{byDay.get(day)?.length ?? 0}<span className="hidden sm:inline"> emisiones</span></span>
                {day === today && <span className="mt-1 block text-[10px] font-bold text-primary">HOY</span>}
              </button>
            ))}
          </div>
          <section className={`space-y-4 ${weekly ? 'xl:hidden' : ''}`} aria-label="Agenda del día">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-3">
              <h2 className="text-xl font-bold first-letter:uppercase">{label(active, { weekday: 'long', day: 'numeric', month: 'long' })}{active === today && <span className="ml-3 rounded-md bg-primary/10 px-2 py-1 align-middle text-xs text-primary">Hoy</span>}</h2>
              <span className="text-sm text-muted-foreground">{byDay.get(active)?.length ?? 0} emisiones</span>
            </div>
            <div className="space-y-3">
              {(byDay.get(active) ?? []).filter((e) => active !== today || e.at <= now).map((e) => eventCard(e))}
              {active === today && <div className="flex items-center gap-3 py-2 text-xs font-semibold text-primary"><span className="h-2 w-2 rounded-full bg-primary" /><span>Ahora · {time.format(now)}</span><span className="h-px flex-1 bg-primary/30" /></div>}
              {active === today && (byDay.get(active) ?? []).filter((e) => e.at > now).map((e) => eventCard(e))}
              {!byDay.get(active)?.length && <div className="rounded-2xl border border-dashed px-6 py-12 text-center"><p className="font-semibold">{p.followed ? 'No hay emisiones de lo que seguís este día' : 'Sin emisiones anunciadas para este día'}</p><p className="mt-2 text-sm text-muted-foreground">{p.warnings.length ? 'Los datos están incompletos. Volvé a intentar más tarde.' : 'Elegí otro día para consultar su programación.'}</p>{p.followed && <button className={`${button} mt-4`} onClick={() => go({ mode: 'all' })}>Ver todas las emisiones</button>}</div>}
            </div>
          </section>
          {weekly && <div className="hidden gap-1 xl:grid xl:grid-cols-7">
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
                    {label(day, { weekday: 'long' })}
                    {day === today ? ' · Hoy' : ''}
                    <span
                      className={`font-mono text-xs font-medium ${day === today ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {day.slice(-2)}
                    </span>
                  </h2>
                  {entries.filter((e) => day !== today || e.at <= now).map((e) => eventCard(e, true))}
                  {line}
                  {day === today && entries.filter((e) => e.at > now).map((e) => eventCard(e, true))}
                  {!entries.length && (
                    <p className="text-xs text-muted-foreground">Sin emisiones anunciadas.</p>
                  )}
                </section>
              );
            })}
          </div>}
          <ul aria-label="Colores de los estados de tu biblioteca" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {Object.entries(statusColors).map(([status, color]) => (
              <li key={status} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
                {statusNames[status]}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Lo que sigo incluye Viendo, Pendiente y En pausa. Los horarios estimados son orientativos.
            Emitido no implica disponibilidad en tu plataforma. Datos de AniList, MAL y{' '}
            <a href="https://www.tvmaze.com/" className="underline">
              TVmaze
            </a>
            .
          </p>
        </>
      )}
      </div>
    </section>
  );
}
