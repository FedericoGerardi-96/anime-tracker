import type { ReactNode } from 'react';
import Link from 'next/link';
import { JetBrains_Mono, Unbounded } from 'next/font/google';
import { CATALOG_GENRES } from '@/lib/catalog-filter-values';
import { sharedListPath } from '@/lib/list-sharing';
import { getProfileAvatar, getProfileInitials, profileAvatarBackground } from '@/lib/profile-avatar';
import type { AnimeProfileSummary } from '@/lib/profile-summary';
import { slugify } from '@/lib/utils';
import { getMyProfileFriends, getMyProfileHighlights, getProfileAnimeSummary, getProfilePublicLists, PROFILE_LISTS_PAGE_SIZE } from '@/services/profile-page';
import { getVisibleHighlights, type PublicSocialProfile } from '@/services/social';
import { getProfileImagesByUser } from '@/services/profile-images';
import type { ProfileHighlightCategory } from '@/types/profile-highlights';
import type { SocialConnection } from '@/types/social';
import ProfileBanner from './ProfileBanner';
import ProfileCover from './ProfileCover';
import ProfileHighlights from './ProfileHighlights';
import styles from './ProfileView.module.css';

const display = Unbounded({ subsets: ['latin'], weight: ['600', '700'], variable: '--profile-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '400', variable: '--profile-mono' });
const number = new Intl.NumberFormat('es-AR');
const date = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
const genreLabels = new Map<string, string>(CATALOG_GENRES);
const genreColors = ['var(--brand-mint)', 'var(--brand-aurora)', 'var(--brand-sakura)', '#74c7ff', '#ffc566'];
const tabs = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'listas', label: 'Listas públicas' },
  { key: 'amigos', label: 'Amigos' },
  { key: 'actividad', label: 'Actividad' },
] as const;

type Profile = {
  id: string;
  name: string;
  username?: string | null;
  bio?: string | null;
  avatar: string | null;
  cover: string | null;
  joinedAt?: string;
};

type PublicLists = Awaited<ReturnType<typeof getProfilePublicLists>>;
type Query = Record<string, string | string[] | undefined>;

export default async function ProfileView({ profile, own, query, privacy, relationship }: Readonly<{
  profile: Profile;
  own: boolean;
  query: Query;
  privacy?: PublicSocialProfile;
  relationship?: ReactNode;
}>) {
  const base = own && !privacy ? '/profile' : `/users/${encodeURIComponent(profile.username ?? '')}`;
  const tab = tabs.find(({ key }) => key === query.tab)?.key ?? 'resumen';
  const listPage = typeof query.page === 'string' && /^\d{1,5}$/.test(query.page) ? Math.max(1, Number(query.page)) : 1;
  const canViewLibrary = own || privacy?.can_view_library === true;
  const visible: ProfileHighlightCategory[] = [];
  if (own || privacy?.can_view_featured_anime) visible.push('anime');
  if (own || privacy?.can_view_featured_manga) visible.push('manga');
  if (own || privacy?.can_view_featured_characters) visible.push('character');

  const [summary, highlights, lists, friends] = await Promise.all([
    canViewLibrary ? getProfileAnimeSummary(profile.id, profile.username ?? null).catch(() => null) : null,
    tab === 'resumen' && visible.length > 0
      ? (own ? getMyProfileHighlights() : getVisibleHighlights(profile.id)).catch(() => null) : [],
    tab === 'resumen' ? getProfilePublicLists(profile.id, 3).catch(() => null)
      : tab === 'listas' ? getProfilePublicLists(profile.id, PROFILE_LISTS_PAGE_SIZE, (listPage - 1) * PROFILE_LISTS_PAGE_SIZE).catch(() => null) : null,
    own ? getMyProfileFriends().catch(() => null) : null,
  ]);
  const identity = [
    profile.username && `@${profile.username}`,
    profile.joinedAt && `se unió en ${date.format(new Date(profile.joinedAt)).replace(' de ', ' ')}`,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`${styles.profile} ${profile.cover ? styles.withCover : ''} ${display.variable} ${mono.variable}`}>
      <ProfileBanner src={profile.cover} />
      <div className={styles.wrap}>
        <header className={styles.header}>
          <Avatar name={profile.name} src={profile.avatar} />
          <div className={styles.identity}>
            <h1>{profile.name}</h1>
            {identity && <p className={styles.mono}>{identity}</p>}
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>
          {own ? (
            <div className={styles.actions}>
              <Link className={styles.button} href="/settings/profile">Editar perfil</Link>
              <Link className={`${styles.button} ${styles.iconButton}`} href="/settings" aria-label="Ajustes">
                <span className="material-symbols-outlined" aria-hidden="true">settings</span>
              </Link>
            </div>
          ) : relationship}
        </header>

        <nav className={styles.tabs} aria-label="Secciones del perfil">
          {tabs.map(({ key, label }) => (
            <Link key={key} href={key === 'resumen' ? base : `${base}?tab=${key}`} scroll={false}
              aria-current={tab === key ? 'page' : undefined}>
              {label}{key === 'amigos' && friends ? ` · ${friends.length}` : ''}
            </Link>
          ))}
        </nav>

        <div className={styles.columns}>
          <div className={styles.content}>
            {tab === 'resumen' && (
              <>
                {summary && <Stats summary={summary} />}
                <ProfileHighlights items={highlights?.filter(item => visible.includes(item.category)) ?? null} own={own} visible={visible} />
                {canViewLibrary && <Genres summary={summary} />}
                <PublicListsSection lists={lists} base={base} />
              </>
            )}
            {tab === 'listas' && <PublicListsSection lists={lists} base={base} page={listPage} />}
            {tab === 'amigos' && <Friends own={own} friends={friends} />}
            {tab === 'actividad' && (
              <section className={styles.section}>
                <h2 className={styles.heading}>Actividad</h2>
                <p className={styles.muted}>El historial de actividad todavía no está disponible.</p>
              </section>
            )}
          </div>
          <aside className={styles.sidebar} aria-label="Más sobre el perfil">
            <Watching summary={summary} canView={canViewLibrary} own={own} />
            {own && (
              <>
                <section className={`${styles.panel} ${styles.importPanel}`}>
                  <h2>¿Venís de MyAnimeList o AniList?</h2>
                  <p className={styles.muted}>Importá tu biblioteca con estados y episodios. No hace falta cargar serie por serie.</p>
                  <div className={styles.importActions}>
                    <Link className={`${styles.button} ${styles.primaryButton}`} href="/settings/connections#mal">Importar de MAL</Link>
                    <Link className={styles.button} href="/settings/connections#anilist">Importar de AniList</Link>
                  </div>
                </section>
                <section className={styles.panel}>
                  <h2>En Ajustes</h2>
                  <p className={styles.muted}>Usuario y biografía, privacidad de cada sección, cuentas conectadas y contenido adulto. Fuera del perfil público.</p>
                </section>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, src }: Readonly<{ name: string; src: string | null }>) {
  return <span className={styles.avatar} aria-hidden="true">
    {src ? <span style={{ backgroundImage: profileAvatarBackground(src) }} /> : <span>{getProfileInitials(name)}</span>}
  </span>;
}

function Stats({ summary }: Readonly<{ summary: AnimeProfileSummary }>) {
  return (
    <dl className={styles.stats} aria-label="Estadísticas de anime">
      {([
        ['completadas', summary.completed], ['horas vistas', null],
        ['episodios', summary.episodes], ['puntaje promedio', null],
      ] as const).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={styles.mono}>{value === null
            ? <><span aria-hidden="true">—</span><span className="sr-only">Sin datos</span></>
            : number.format(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Genres({ summary }: Readonly<{ summary: AnimeProfileSummary | null }>) {
  const genres = summary?.genres ?? [];
  const total = genres.reduce((sum, genre) => sum + genre.count, 0);
  return (
    <section className={`${styles.section} ${styles.genres}`}>
      <h2 className={styles.heading}>Lo que más mira</h2>
      {total === 0 ? <p className={styles.muted}>{summary ? 'Todavía no hay géneros para mostrar.' : 'No pudimos cargar los géneros.'}</p> : (
        <>
          <div className={styles.genreBar} aria-hidden="true">
            {genres.map((genre, index) => <span key={genre.name} style={{ flex: genre.count, background: genreColors[index] }} />)}
          </div>
          <ul className={styles.genreLabels} aria-label="Proporción entre los géneros principales">
            {genres.map(genre => (
              <li key={genre.name}>{genreLabels.get(genre.name) ?? genre.name} <span className={styles.mono}>{Math.round(genre.count / total * 100)}%</span></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Watching({ summary, canView, own }: Readonly<{ summary: AnimeProfileSummary | null; canView: boolean; own: boolean }>) {
  return (
    <section className={`${styles.panel} ${styles.watching}`}>
      <h2>Viendo ahora</h2>
      {!canView ? <p className={styles.muted}>Esta sección es privada.</p>
        : !summary ? <p className={styles.muted}>No pudimos cargar esta sección.</p>
        : !summary.watching.length ? <p className={styles.muted}>{own ? 'Todavía no tenés anime en curso.' : 'Todavía no hay anime en curso.'}</p>
        : (
          <ul className={styles.watchingList}>
            {summary.watching.map(anime => {
              const total = anime.total_units && anime.total_units > 0 ? anime.total_units : null;
              const width = total ? Math.min(100, 100 * anime.current_episode / total) : 0;
              return (
                <li key={anime.mal_id}>
                  <Link className={styles.watchingRow} href={`/anime/${anime.mal_id}-${slugify(anime.title)}`}>
                    <span className={styles.thumb}><ProfileCover src={anime.image} /></span>
                    <span className={styles.watchingName}>
                      <strong>{anime.title}</strong>
                      {total && <span className={styles.progress} aria-hidden="true"><span style={{ width: `${width}%` }} /></span>}
                    </span>
                    <span className={`${styles.mono} ${styles.watchingCount}`}>
                      <span className="sr-only">Episodio </span>{anime.current_episode}{total ? `/${total}` : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}

function PublicListsSection({ lists, base, page }: Readonly<{ lists: PublicLists | null; base: string; page?: number }>) {
  const path = `${base}?tab=listas`;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.heading}>Listas públicas</h2>
        {page === undefined && lists && lists.total > 3 && <Link className={styles.textLink} href={path} scroll={false}>Ver las {number.format(lists.total)}</Link>}
      </div>
      {!lists ? <p className={styles.muted}>No pudimos cargar las listas públicas.</p>
        : !lists.items.length ? <p className={styles.muted}>{page && page > 1 ? 'No hay listas en esta página.' : 'Todavía no hay listas públicas.'}</p>
        : (
          <ul className={styles.listGrid}>
            {lists.items.map(list => (
              <li key={list.slug}>
                <Link className={styles.listCard} href={sharedListPath(list.slug)}>
                  <span className={styles.listCovers} aria-hidden="true">
                    {(list.images.length ? list.images : [null]).map((src, index) => (
                      <span className={styles.thumb} key={index}><ProfileCover src={src} /></span>
                    ))}
                  </span>
                  <span><strong>{list.name}</strong><small>{`Colección · ${number.format(list.total)} ${list.total === 1 ? 'título' : 'títulos'}`}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      {page !== undefined && lists && (page > 1 || page * PROFILE_LISTS_PAGE_SIZE < lists.total) && (
        <nav className={styles.actions} aria-label="Páginas de listas públicas">
          {page > 1 && <Link className={styles.button} href={page === 2 ? path : `${path}&page=${page - 1}`} scroll={false}>Anterior</Link>}
          {page * PROFILE_LISTS_PAGE_SIZE < lists.total && <Link className={styles.button} href={`${path}&page=${page + 1}`} scroll={false}>Siguiente</Link>}
        </nav>
      )}
    </section>
  );
}

async function Friends({ own, friends }: Readonly<{ own: boolean; friends: SocialConnection[] | null }>) {
  const images = own && friends?.length ? await getProfileImagesByUser(friends.map(friend => friend.user_id)) : null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.heading}>Amigos</h2>
        {own && <Link className={styles.textLink} href="/friends">Administrar amigos</Link>}
      </div>
      {!own ? <p className={styles.muted}>La lista de amigos solo está disponible para su titular.</p>
        : !friends ? <p className={styles.muted}>No pudimos cargar tus amigos.</p>
        : !friends.length ? <p className={styles.muted}>Todavía no tenés amigos agregados.</p>
        : (
          <ul className={styles.listGrid}>
            {friends.map(friend => (
              <li key={friend.friendship_id}>
                <Link className={`${styles.listCard} ${styles.friendCard}`} href={`/users/${encodeURIComponent(friend.username)}`}>
                  <Avatar name={friend.full_name || friend.username} src={getProfileAvatar(images?.get(friend.user_id)?.avatar, friend.avatar)} />
                  <span><strong>{friend.full_name || friend.username}</strong><small>@{friend.username}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
