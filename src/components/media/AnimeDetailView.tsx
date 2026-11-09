import { Suspense } from 'react';
import Image from 'next/image';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import type { MediaDetailViewProps } from '@/interfaces/media-detail-view';
import { getAnimePresentation } from '@/services/media-detail';
import { getCatalogProvider } from '@/services/catalog-provider';
import { getCalendarMappings } from '@/services/calendar-mappings';
import { getImdbScore } from '@/services/imdb-ratings';
import { getCatalogStatusLabel } from '@/lib/media-status';
import { CATALOG_GENRES } from '@/lib/catalog-filter-values';
import BackButton from '@/components/navigation/BackButton';
import { ActionsSkeleton, GridSkeleton } from '@/components/fallbacks/PageSkeleton';
import MediaPersonalActions from './MediaPersonalActions';
import MediaSynopsis from './MediaSynopsis';
import AnimeDetailCharacters from './AnimeDetailCharacters';
import AnimeRelatedReading from './AnimeRelatedReading';
import AnimeRelatedAnime from './AnimeRelatedAnime';
import MediaDetailRecommendations from './MediaDetailRecommendations';
import AnimeBanner from './AnimeBanner';
import styles from './AnimeDetailView.module.css';

const display = Unbounded({ subsets: ['latin'], weight: ['600'], variable: '--anime-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--anime-mono' });

function ProviderScore({ label, href, score, loading = false }: { label: string; href?: string; score: number | null; loading?: boolean }) {
  return <div className={styles.score}>
    {href ? <a href={href}>{label} ↗</a> : <span>{label}</span>}
    <strong aria-label={loading ? 'Cargando puntaje' : score !== null ? `${score} sobre 10` : 'Puntaje no disponible'}>
      {loading ? '…' : score?.toFixed(1) ?? '—'}
    </strong>
  </div>;
}

async function ImdbScore({ id, href }: { id?: string; href?: string }) {
  const score = await getImdbScore(id);
  return <>
    <ProviderScore label="IMDb" href={href} score={score} />
  </>;
}

export default async function AnimeDetailView({ detail }: Readonly<MediaDetailViewProps>) {
  const [presentation, provider, mappings] = await Promise.all([
    getAnimePresentation(detail.malId), getCatalogProvider(), getCalendarMappings().catch(() => null),
  ]);
  const native = detail.names?.find(name => name.label === 'Japonés')?.value;
  const identity = mappings?.byMal[detail.malId];
  const aniId = presentation.anilistId ?? identity?.ani;
  const imdbHref = identity?.imdb ? `https://www.imdb.com/title/${identity.imdb}/` : undefined;
  const scores = [
    { label: 'AniList', score: presentation.anilistScore, href: aniId ? `https://anilist.co/anime/${aniId}` : undefined },
    { label: 'MAL', score: provider === 'myanimelist' ? detail.score : presentation.malScore, href: `https://myanimelist.net/anime/${detail.malId}` },
  ];
  return (
    <article className={`${styles.page} ${display.variable} ${mono.variable}`}>
      <header className={styles.hero}>
        <AnimeBanner key={presentation.banner} src={presentation.banner} title={native || detail.title} />
        <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
          <BackButton label="← Volver al catálogo" fallback="/anime" className={`${styles.back} cursor-pointer`} />
        </nav>
        <div className={styles.heading}>
          <div className={styles.poster}>
            <Image src={detail.image || '/placeholder-cover.svg'} alt={`Portada de ${detail.displayTitle}`} fill preload sizes="(max-width: 600px) 136px, 230px" className="object-cover" />
          </div>
          <div className={styles.intro}>
            <div className={styles.badges}><span>{getCatalogStatusLabel(detail.status, 'anime')}</span><span>{detail.format}</span></div>
            <h1>{detail.displayTitle}</h1>
            <p className={styles.subtitle}>{[native, detail.creator, detail.metadata?.find(item => item.label === 'Año')?.value].filter(Boolean).join(' · ')}</p>
            <div className={styles.scores} aria-label="Puntajes de los proveedores, sobre 10">
              {scores.map(item => <ProviderScore key={item.label} {...item} />)}
              <Suspense fallback={<ProviderScore label="IMDb" href={imdbHref} score={null} loading />}>
                <ImdbScore id={identity?.imdb} href={imdbHref} />
              </Suspense>
            </div>
            <Suspense fallback={<ActionsSkeleton />}>
              <MediaPersonalActions malId={detail.malId} mediaType="anime" animeData={detail.cardData} maxEpisodes={detail.units || undefined} />
            </Suspense>
          </div>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.content}>
          <section aria-labelledby="anime-synopsis" className={styles.synopsis}>
            <h2 id="anime-synopsis" className={styles.eyebrow}>Sinopsis</h2>
            {detail.synopsis ? <Suspense fallback={<p>{detail.synopsis.trim()}</p>}><MediaSynopsis malId={detail.malId} mediaType="anime" original={detail.synopsis.trim()} /></Suspense> : <p>No hay una sinopsis disponible.</p>}
            <div className={styles.genres}>{detail.genres.map(genre => <span key={genre.mal_id}>{CATALOG_GENRES.find(([name]) => name === genre.name)?.[1] ?? genre.name}</span>)}</div>
          </section>
          <Suspense fallback={<GridSkeleton count={6} label="Cargando personajes…" />}><AnimeDetailCharacters malId={detail.malId} slug={detail.slug} /></Suspense>
          <Suspense fallback={<p className="py-4 text-sm text-muted-foreground" role="status">Cargando animes relacionados…</p>}><AnimeRelatedAnime malId={detail.malId} /></Suspense>
          <Suspense fallback={null}><AnimeRelatedReading malId={detail.malId} /></Suspense>
        </div>
        <aside className={styles.aside} aria-label="Información del anime">
          <section className={styles.panel}>
            <h2>Detalles</h2>
            <dl>{detail.metadata?.map(item => <div className={styles.fact} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
            {detail.rank ? <div className={styles.fact}><span>Ranking · {provider === 'anilist' ? 'AniList' : 'MAL'}</span><b>#{detail.rank}</b></div> : null}
          </section>
          <section className={styles.panel}>
            <h2>Nombres</h2>
            <dl>{detail.names?.map(item => <div className={styles.name} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
          </section>
        </aside>
      </div>
      <Suspense fallback={<GridSkeleton count={5} label="Cargando recomendaciones…" />}><MediaDetailRecommendations malId={detail.malId} mediaType="anime" /></Suspense>
    </article>
  );
}
