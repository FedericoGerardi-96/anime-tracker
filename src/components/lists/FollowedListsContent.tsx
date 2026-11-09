import Link from 'next/link';
import { getFollowedLists, SHARED_LIST_PAGE_SIZE } from '@/services/list-sharing';
import { FOLLOWED_LISTS_PATH, sharedListPath } from '@/lib/list-sharing';
import Pagination from '@/components/ui/Pagination';
import UnfollowListButton from './UnfollowListButton';

export default async function FollowedListsContent({ page }: { page: number }) {
  const offset = (page - 1) * SHARED_LIST_PAGE_SIZE;
  const rows = await getFollowedLists(offset, SHARED_LIST_PAGE_SIZE + 1).catch(() => null);
  const lists = rows?.slice(0, SHARED_LIST_PAGE_SIZE);

  return <section className="space-y-6">
    <header className="space-y-2">
      <h1 className="text-3xl font-extrabold">De amigos</h1>
      <p className="text-sm text-muted-foreground">Las listas compartidas que seguís.</p>
    </header>
    {lists?.length ? <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {lists.map(list => <li key={list.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          {list.slug ? <Link href={sharedListPath(list.slug)} prefetch={false} className="break-words font-bold hover:text-primary">
            {list.name ?? 'Lista compartida'}
          </Link> : <p className="font-bold">Lista no disponible</p>}
          {list.total !== null && <p className="mt-1 text-xs text-muted-foreground">{list.total} {list.total === 1 ? 'título' : 'títulos'}</p>}
        </div>
        <UnfollowListButton id={list.id} />
      </li>)}
    </ul> : <p className="rounded-2xl border border-border bg-card p-5 text-muted-foreground" role={lists ? undefined : 'alert'}>
      {lists ? page > 1 ? 'No hay listas en esta página.' : 'Todavía no seguís listas. Abrí un enlace compartido y elegí Seguir lista.'
        : 'No pudimos cargar las listas que seguís. Recargá para volver a intentar.'}
    </p>}
    {rows && (page > 1 || rows.length > SHARED_LIST_PAGE_SIZE) && (rows.length
      ? <Pagination currentPage={page} hasNextPage={rows.length > SHARED_LIST_PAGE_SIZE} showBoundaryPages={false} />
      : <Link href={FOLLOWED_LISTS_PATH} className="text-primary underline">Volver a la primera página</Link>)}
  </section>;
}
