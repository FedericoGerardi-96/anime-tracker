import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { getCatalogStatusLabel } from '@/lib/media-status';
import type { MediaDetailViewProps } from '@/interfaces/media-detail-view';
import { ActionsSkeleton, GridSkeleton } from '@/components/fallbacks/PageSkeleton';
import BackButton from '@/components/navigation/BackButton';
import MediaPersonalActions from './MediaPersonalActions';
import MediaSynopsis from './MediaSynopsis';
import MediaDetailRecommendations from './MediaDetailRecommendations';
import AnimeDetailCharacters from './AnimeDetailCharacters';
import AnimeRelatedReading from './AnimeRelatedReading';

export default function MediaDetailView({ detail }: Readonly<MediaDetailViewProps>) {
  const isAnime = detail.mediaType === 'anime';
  const typeLabel = isAnime ? 'Anime' : 'Manga';

  return (
    <div className="relative flex-1 px-4 pb-8 sm:px-8 lg:px-12">
      <div className="detail-hero pointer-events-none absolute top-0 left-0 z-0 h-[600px] w-full overflow-hidden">
        <div
          className="h-full w-full scale-110 bg-cover bg-center blur-3xl"
          style={{ backgroundImage: `url('${detail.image}')` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto pt-4 max-w-7xl lg:pt-6">
        <nav aria-label="Ruta de navegación" className="mb-8 flex items-center gap-2 px-4 text-xs font-medium text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label={typeLabel} fallback={`/${detail.mediaType}`} className="transition-colors hover:text-primary" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="truncate text-primary">{detail.title}</span>
        </nav>

        <div className="mb-12 flex flex-col items-end gap-8 px-4 lg:flex-row lg:gap-12">
          <div className="mx-auto w-full max-w-[280px] shrink-0 sm:max-w-[260px] lg:mx-0 lg:w-[280px] lg:max-w-none">
            <div className="detail-shadow group relative aspect-2/3 overflow-hidden rounded-2xl border border-border">
              <Image
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                src={detail.image}
                alt={detail.title}
                fill
                priority
                sizes="(max-width: 640px) 280px, 280px"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {detail.rank && (
                <span className="rounded bg-primary px-2 py-1 text-[10px] font-bold tracking-wider text-primary-foreground uppercase">
                  {isAnime ? 'Trending' : 'Rank'} #{detail.rank}
                </span>
              )}
              <span className="rounded bg-accent px-2 py-1 text-[10px] font-bold tracking-wider text-accent-foreground uppercase dark:bg-slate-800 dark:text-white">
                {detail.format}
              </span>
            </div>

            <h1 className="mb-6 text-5xl leading-none font-black text-foreground lg:text-7xl">
              {detail.displayTitle}
            </h1>

            <div className="mb-8 flex flex-wrap gap-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-2xl font-bold text-foreground">{detail.score || 'N/A'}</span>
                <span className="mt-1 text-xs text-muted-foreground">Puntuación</span>
              </div>
              <div className="hidden h-8 w-px bg-border md:block" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">{detail.units || '?'}</span>
                <span className="text-xs text-muted-foreground">{isAnime ? 'Episodios' : 'Capítulos'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">{getCatalogStatusLabel(detail.status, detail.mediaType)}</span>
                <span className="text-xs text-muted-foreground">Estado</span>
              </div>
              <div className="flex flex-col">
                <span className="max-w-[150px] truncate text-lg font-bold text-foreground">{detail.creator}</span>
                <span className="text-xs text-muted-foreground">{isAnime ? 'Estudio' : 'Autor'}</span>
              </div>
            </div>

            <Suspense fallback={<ActionsSkeleton />}>
              <MediaPersonalActions
                malId={detail.malId}
                mediaType={detail.mediaType}
                animeData={detail.cardData}
                maxEpisodes={detail.units || undefined}
              />
            </Suspense>
          </div>
        </div>

        <div className="px-4">
          <div className="detail-panel detail-shadow mb-16 rounded-3xl p-8 lg:p-10">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 rounded-full bg-primary" />
                  <h2 className="text-sm font-black tracking-widest text-primary uppercase">Sinopsis</h2>
                </div>
                {detail.synopsis ? (
                  <Suspense fallback={<p className="mb-6 text-lg leading-relaxed text-foreground/80 dark:text-slate-300">{detail.synopsis.trim()}</p>}>
                    <MediaSynopsis malId={detail.malId} mediaType={detail.mediaType} original={detail.synopsis.trim()} />
                  </Suspense>
                ) : (
                  <p className="mb-6 text-lg text-foreground/80 dark:text-slate-300">No hay una sinopsis disponible.</p>
                )}
                {detail.genres.length > 0 && <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Géneros</h2>}
                <div className="flex flex-wrap gap-2">
                  {detail.genres.map((genre) => (
                    <span key={genre.mal_id} className="rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium dark:bg-slate-800">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-0 space-y-6 lg:border-l lg:border-border lg:pl-8">
                {detail.names && detail.names.length > 0 && (
                  <section aria-labelledby="media-names">
                    <h2 id="media-names" className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Nombres</h2>
                    <dl className="divide-y divide-border">
                      {detail.names.map(name => <div key={name.label} className="py-3 first:pt-0">
                        <dt className="mb-1 text-xs text-muted-foreground">{name.label}</dt>
                        <dd className="wrap-break-word text-sm font-semibold text-foreground">{name.value}</dd>
                      </div>)}
                    </dl>
                  </section>
                )}
                {detail.metadata && detail.metadata.length > 0 && (
                  <section aria-labelledby="media-details">
                    <h2 id="media-details" className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Detalles</h2>
                    <dl className="divide-y divide-border">
                      {detail.metadata.map(item => <div key={item.label} className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="shrink-0 text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="min-w-0 wrap-break-word text-right text-sm font-semibold text-foreground">{item.value}</dd>
                      </div>)}
                    </dl>
                  </section>
                )}
                <section aria-label="Estadísticas">
                  <dl className="divide-y divide-border">
                    {[{ label: 'Puntuación', value: detail.score ? `${detail.score} / 10` : null }, { label: 'Ranking', value: detail.rank ? `#${detail.rank}` : null }].filter(item => item.value).map(item => (
                      <div key={item.label} className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="text-xs text-muted-foreground">{item.label}</dt>
                        <dd className="text-sm font-bold text-foreground">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </div>
          </div>

          {isAnime && (
            <Suspense fallback={null}>
              <AnimeRelatedReading malId={detail.malId} />
            </Suspense>
          )}

          {isAnime && (
            <Suspense fallback={<div className="mt-20"><GridSkeleton count={6} label="Cargando personajesâ€¦" /></div>}>
              <AnimeDetailCharacters malId={detail.malId} slug={detail.slug} />
            </Suspense>
          )}

          <Suspense fallback={<div className="mt-20"><GridSkeleton count={5} label="Cargando recomendacionesâ€¦" /></div>}>
            <MediaDetailRecommendations malId={detail.malId} mediaType={detail.mediaType} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
