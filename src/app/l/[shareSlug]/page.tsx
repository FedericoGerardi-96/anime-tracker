import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import SharedListView from '@/components/lists/SharedListView';
import SharedListProgress from '@/components/lists/SharedListProgress';
import styles from '@/components/lists/SharedListView.module.css';
import { formatLabel } from '@/lib/library-editor';
import { sharedListPath } from '@/lib/list-sharing';
import { slugify } from '@/lib/utils';
import { getSharedList, getSharedListProgress, isFollowingSharedList, SHARED_LIST_PAGE_SIZE } from '@/services/list-sharing';
import { getAuthenticatedUser } from '@/services/supabase';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ shareSlug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function readPage(value: string | string[] | undefined) {
  const page = Number(value);
  return typeof value === 'string' && Number.isSafeInteger(page) && page > 0
    ? Math.min(page, Math.floor(1000000 / SHARED_LIST_PAGE_SIZE) + 1)
    : 1;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareSlug } = await params;
  const list = await getSharedList(shareSlug);
  if (!list) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const title = list.title + ' · AniTrack';
  const url = host && /^[\w.-]+(?::\d+)?$/.test(host) ? protocol + '://' + host + sharedListPath(shareSlug) : undefined;
  const images = url ? [{ url: url + '/preview.png', width: 1200, height: 630, alt: 'Portadas de ' + list.title }] : [];
  return {
    title: { absolute: title },
    description: list.subtitle,
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'AniTrack', title, description: list.subtitle, url, images },
    twitter: { card: 'summary_large_image', title, description: list.subtitle, images },
  };
}

export default async function SharedListPage({ params, searchParams }: Props) {
  const [{ shareSlug }, query] = await Promise.all([params, searchParams]);
  const page = readPage(query.page);
  const [list, firstPage, user] = await Promise.all([
    page === 1 ? getSharedList(shareSlug) : getSharedList(shareSlug, (page - 1) * SHARED_LIST_PAGE_SIZE),
    page > 1 ? getSharedList(shareSlug) : null,
    getAuthenticatedUser(),
  ]);
  if (!list) notFound();
  const viewer = !user ? 'guest' : user.id === list.ownerId ? 'owner' : 'member';
  const [following, progress] = await Promise.all([
    user && viewer === 'member' ? isFollowingSharedList(list.id, shareSlug, user.id).catch(() => null) : false,
    user ? getSharedListProgress(user.id, list.items.map(item => item.mediaId)).catch(() => null) : [],
  ]);
  const progressById = new Map(progress?.map(row => [row.media_id, row]));
  const completed = list.items.filter(item => progressById.get(item.mediaId)?.status === 'completed').length;
  const covers = (firstPage ?? list).items.filter(item => item.image).slice(0, 3);
  const initials = list.owner.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  const owner = <><span className={styles.avatar + ' size-6'} aria-hidden="true"><span>{initials}</span></span>
    <span>Lista de <strong className="text-foreground">{list.owner}</strong> · Colección</span></>;
  const ownerClass = 'inline-flex items-center gap-2 text-[13px] text-muted-foreground';
  const header = <header className={styles.header}>
    <div className={styles.covers} aria-hidden="true">
      {[1, 2, 0].map((index, slot) => <span key={slot} className={styles.cover}>
        {covers[index]?.image && <Image src={covers[index].image} alt="" fill sizes="100px" className="object-cover" />}
      </span>)}
    </div>
    <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
      {list.username ? <Link href={'/users/' + list.username} className={ownerClass + ' self-start hover:text-primary'}>{owner}</Link> : <p className={ownerClass}>{owner}</p>}
      <h1 className={styles.title}>{list.title}</h1>
      {list.description && <p className="whitespace-pre-wrap break-words text-[15px] text-muted-foreground">{list.description}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <span className="font-mono">{list.total} {list.total === 1 ? 'título' : 'títulos'}</span>
        {user && progress && list.items.length > 0 && <>
          <span className="font-bold text-primary">Completaste {completed} de {list.items.length}{list.total > SHARED_LIST_PAGE_SIZE ? ' en esta página' : ''}</span>
          <div className={styles.bar} role="progressbar" aria-label="Títulos completados en esta página"
            aria-valuemin={0} aria-valuemax={list.items.length} aria-valuenow={completed}>
            <span style={{ width: (completed / list.items.length * 100) + '%' }} />
          </div>
        </>}
      </div>
    </div>
  </header>;

  return <SharedListView key={shareSlug} id={list.id} slug={shareSlug} title={list.title} owner={list.owner} viewer={viewer} following={following} header={header}>
    {list.items.length ? <ol aria-label="Títulos de la lista" className={styles.grid}>
      {list.items.map((item, index) => {
        const titlePath = `/${item.type}/${item.malId}-${slugify(item.title)}`;
        const saved = progressById.get(item.mediaId);
        return <li key={item.id} className="min-w-0 space-y-2.5">
          <Link href={titlePath} aria-label={item.title} className={styles.posterLink}>
            <span className={styles.poster}>
              {item.image && <Image src={item.image} alt="" fill sizes="(min-width: 1280px) 212px, (min-width: 640px) 28vw, 46vw" className="object-cover" />}
              <span aria-hidden="true" className={styles.number}>{String((page - 1) * SHARED_LIST_PAGE_SIZE + index + 1).padStart(2, '0')}</span>
              <span aria-hidden="true" className={styles.posterTitle}>{item.title}</span>
            </span>
          </Link>
          <div>
            <p className="truncate text-[14.5px] font-extrabold leading-tight" title={item.title}>{item.title}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {formatLabel(item.type, item.format)}{item.total ? ' · ' + item.total + (item.type === 'manga' ? ' cap.' : ' eps.') : ''}
            </p>
          </div>
          {user && progress && <SharedListProgress key={saved?.updated_at ?? 'new'} id={item.mediaId} title={item.title} type={item.type}
            total={item.total} initial={{ exists: Boolean(saved), revision: saved?.updated_at ?? null, status: saved?.status ?? null, episode: saved?.current_episode ?? 0 }} />}
        </li>;
      })}
    </ol> : <p className="rounded-2xl border border-border bg-card p-5 text-muted-foreground">
      {list.total ? 'No hay títulos en esta página.' : 'Todavía no hay títulos en esta lista.'}
    </p>}
    {page > 1 && !list.items.length
      ? <Link href={sharedListPath(shareSlug)} className="text-primary underline">Volver a la primera página</Link>
      : <Pagination currentPage={page} totalPages={Math.ceil(list.total / SHARED_LIST_PAGE_SIZE)} />}
    {user && list.items.length > 0 && <p className="text-xs text-muted-foreground">{progress ? 'Las tarjetas muestran tu estado y tu progreso.' : 'No pudimos cargar tu progreso. Recargá para volver a intentar.'}</p>}
  </SharedListView>;
}
