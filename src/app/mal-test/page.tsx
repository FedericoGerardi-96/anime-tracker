import Image from "next/image";
import Link from "next/link";

import {
  getMalAnimeRanking,
  MyAnimeListApiError,
  MyAnimeListConfigError,
} from "@/lib/myanimelist-service";

export const metadata = {
  title: "Prueba MyAnimeList API | AniTrack",
};

export default async function MyAnimeListTestPage() {
  let response;
  let requestError: unknown;

  try {
    response = await getMalAnimeRanking(12);
  } catch (error) {
    requestError = error;
  }

  if (response) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-500">
            <span className="size-2 rounded-full bg-emerald-500" />
            Conexión exitosa con MyAnimeList API v2
          </div>
          <h1 className="text-3xl font-black tracking-tight">Prueba de ranking de anime</h1>
          <p className="mt-2 text-muted-foreground">Esta página consulta directamente la API oficial desde el servidor de AniTrack.</p>
        </header>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {response.data.map(({ node: anime, ranking }) => {
            const image = anime.main_picture?.large || anime.main_picture?.medium;
            return (
              <article key={anime.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-2/3 bg-muted">
                  {image ? (
                    <Image src={image} alt={anime.title} fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-black text-white">#{ranking.rank}</span>
                </div>
                <div className="p-3">
                  <h2 className="line-clamp-2 text-sm font-bold">{anime.alternative_titles?.en || anime.title}</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[anime.media_type?.toUpperCase(), anime.mean ? `★ ${anime.mean.toFixed(1)}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver al inicio
        </Link>
      </main>
    );
  }

    const missingConfig = requestError instanceof MyAnimeListConfigError;
    const apiError = requestError instanceof MyAnimeListApiError ? requestError : null;

    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-6 py-16">
        <section className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12">
          <span className="material-symbols-outlined mb-4 text-5xl text-amber-500">{missingConfig ? "key" : "cloud_off"}</span>
          <h1 className="text-2xl font-black">{missingConfig ? "Falta configurar el Client ID" : "MyAnimeList rechazó la consulta"}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {missingConfig
              ? "Agregá MAL_CLIENT_ID a tu archivo .env y reiniciá el servidor de desarrollo."
              : `La API respondió ${apiError?.status ?? "con un error"}: ${apiError?.message ?? "No fue posible completar la solicitud."}`}
          </p>
          {missingConfig && (
            <code className="mt-5 block rounded-xl bg-muted p-4 text-left text-sm text-foreground">MAL_CLIENT_ID=tu_client_id</code>
          )}
        </section>
      </main>
    );
}
