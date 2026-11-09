'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ListTab } from '@/interfaces/lists';
import CreateListButton from './CreateListButton';
import styles from './ListsTabs.module.css';
import { FOLLOWED_LISTS_PATH } from '@/lib/list-sharing';

const entries = [
  { id: 'library', label: 'Toda la biblioteca', color: 'var(--muted-foreground)' },
  { id: 'watching', label: 'Viendo / Leyendo', color: 'var(--list-watching)' },
  { id: 'plan_to_watch', label: 'Pendientes', color: 'var(--list-pending)' },
  { id: 'completed', label: 'Completados', color: 'var(--list-completed)' },
  { id: 'on_hold', label: 'En pausa', color: 'var(--list-paused)' },
  { id: 'dropped', label: 'Abandonados', color: 'var(--list-dropped)' },
];
interface Props {
  activeTab: ListTab | 'library' | 'friends';
  listId?: string;
  counts?: Record<string, number>;
  lists?: { id: string; name: string; count: number }[];
  unavailable?: boolean;
}
export default function ListsTabs({ activeTab, listId, counts, lists, unavailable = false }: Readonly<Props>) {
  const router = useRouter();
  const selected = activeTab === 'custom_lists' && listId ? '/lists?tab=custom_lists&list=' + encodeURIComponent(listId) : '/lists?tab=' + activeTab;
  const linkClass = (active: boolean) => 'flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ' + (active ? 'bg-card text-foreground shadow-[inset_3px_0_0_var(--brand-sakura)]' : 'text-muted-foreground hover:bg-card hover:text-primary');
  const count = (value: number | undefined) => <span className="ml-auto shrink-0 font-mono text-xs font-normal tabular-nums text-muted-foreground">{value === undefined ? '—' : value.toLocaleString('es-AR')}</span>;
  return <aside className={styles.sidebar + ' min-w-0 space-y-6 lg:sticky lg:top-24'}>
    <CreateListButton />
    <div className="lg:hidden">
      <label htmlFor="list-view" className="mb-2 block text-sm font-medium">Mis listas</label>
      <select id="list-view" value={selected} onChange={event => router.push(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-card p-3 text-foreground">
        <optgroup label="Biblioteca">{entries.map(entry => <option key={entry.id} value={'/lists?tab=' + entry.id}>{entry.label}{counts ? ' · ' + (counts[entry.id] ?? 0) : ''}</option>)}</optgroup>
        <optgroup label="Mis listas">
          <option value="/lists?tab=custom_lists">Todas mis colecciones</option>
          {lists?.map(list => <option key={list.id} value={'/lists?tab=custom_lists&list=' + encodeURIComponent(list.id)}>{list.name} · {list.count}</option>)}
        </optgroup>
        <optgroup label="De amigos"><option value={FOLLOWED_LISTS_PATH}>Listas que seguís</option></optgroup>
      </select>
    </div>
    <nav aria-label="Biblioteca" className="hidden lg:block">
      <p className={styles.heading + ' px-2.5 pb-3 text-muted-foreground'}>Biblioteca</p>
      {entries.map(entry => <Link key={entry.id} href={'/lists?tab=' + entry.id} aria-current={activeTab === entry.id ? 'page' : undefined} className={linkClass(activeTab === entry.id)}>
        <span aria-hidden="true" className={styles.dot} style={{ background: entry.color }} />
        <span>{entry.label}</span>{count(counts ? counts[entry.id] ?? 0 : undefined)}
      </Link>)}
    </nav>
    <nav aria-label="Mis listas" className="hidden lg:block">
      <Link href="/lists?tab=custom_lists" aria-current={activeTab === 'custom_lists' && !listId ? 'page' : undefined} className={styles.heading + ' mb-3 block rounded px-2.5 text-muted-foreground hover:text-primary'}>Mis listas</Link>
      {lists?.map(list => <Link key={list.id} href={'/lists?tab=custom_lists&list=' + encodeURIComponent(list.id)} aria-current={listId === list.id ? 'page' : undefined} className={linkClass(listId === list.id)}>
        <span aria-hidden="true" className={styles.dot + ' ' + styles.collection} />
        <span className="min-w-0 break-words">{list.name}</span>{count(list.count)}
      </Link>)}
      {lists?.length === 0 && <p className="px-2.5 text-sm leading-relaxed text-muted-foreground">Todavía no creaste listas.</p>}
    </nav>
    {unavailable && <p role="status" className="px-2.5 text-sm text-muted-foreground">No pudimos cargar las cantidades ni tus colecciones. Recargá para reintentar.</p>}
    <nav aria-label="De amigos" className="hidden border-t border-border pt-5 lg:block">
      <p className={styles.heading + ' mb-2 px-2.5 text-muted-foreground'}>De amigos</p>
      <Link href={FOLLOWED_LISTS_PATH} aria-current={activeTab === 'friends' ? 'page' : undefined} className={linkClass(activeTab === 'friends')}>
        <span aria-hidden="true" className={styles.dot + ' bg-primary'} />Listas que seguís
      </Link>
    </nav>
  </aside>;
}
