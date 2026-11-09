import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { slugify } from "@/lib/utils";
import { homeDisplayName } from "@/lib/home-greeting";
import { getHomeWatching } from "@/services/home-watching";
import { getAuthenticatedUser } from "@/services/supabase";
import { getUserProfile } from "@/services/profile";
import HomeAiringToday from "./HomeAiringToday";
import HomeLocalDate from "./HomeLocalDate";
import HomeWatchingInfo from "./HomeWatchingInfo";

export default async function HomeWatching() {
  const user = await getAuthenticatedUser();
  if (!user) return (
    <div className="space-y-5">
      <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary  ">Iniciá sesión</Link> para ver tus series en Viendo.
      </p>
      <HomeAiringToday />
    </div>
  );
  const [{ items, error }, profile] = await Promise.all([getHomeWatching(), getUserProfile(user.id)]);
  const name = homeDisplayName(profile?.full_name, profile?.username, user.user_metadata?.full_name, user.user_metadata?.username);

  return (
    <section aria-labelledby="home-watching-title">
      <div className="mb-6 space-y-2">
        <HomeLocalDate />
        <p className="break-words text-3xl font-extrabold tracking-tight sm:text-4xl">{name ? `Hola, ${name}.` : "Hola."}</p>
      </div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id="home-watching-title" className="text-2xl font-bold tracking-tight">Seguir viendo</h2>
        </div>
        <Link href="/lists?tab=watching&type=anime" className="shrink-0 text-sm font-semibold text-primary hover:text-secondary">Ver mi biblioteca</Link>
      </div>

      {error ? (
        <p role="status" className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No pudimos cargar tu progreso. Probá de nuevo más tarde.</p>
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6">
          <p className="font-semibold">Todavía no tenés anime en Viendo.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cuando agregues uno, vas a encontrar tu progreso acá.</p>
          <Link href="/anime" className="mt-4 inline-block text-sm font-semibold text-primary  ">Explorar anime</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => {
            const { media, episode } = entry;
            const total = typeof media.total_units === "number" && media.total_units > 0 ? media.total_units : null;
            return (
              <Link key={entry.id} href={`/anime/${media.mal_id}-${slugify(media.title)}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4">
                <div className="relative h-28 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-20">
                  {media.image && <Image src={media.image} alt="" fill sizes="(min-width: 640px) 80px, 72px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary">Viendo</span>
                  <h3 className="mt-2 line-clamp-2 font-bold group-hover:text-primary sm:text-lg">{media.title}</h3>
                  <Suspense fallback={<p className="mt-1 text-xs text-muted-foreground">Cargando horario…</p>}>
                    <HomeWatchingInfo malId={media.mal_id} total={total} episode={episode} />
                  </Suspense>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {total && <progress aria-label={`Progreso de ${media.title}`} max={total} value={Math.min(episode, total)} className="h-1.5 w-full max-w-xs overflow-hidden rounded-full accent-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />}
                    <span className="text-xs tabular-nums text-muted-foreground">Episodio {episode}{total ? ` / ${total}` : ""}</span>
                  </div>
                </div>
                <span aria-hidden="true" className="material-symbols-outlined text-muted-foreground">chevron_right</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
