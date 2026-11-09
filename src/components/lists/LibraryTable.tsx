'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { removeLibraryFavorite } from '@/lib/actions/library-editor';
import { formatLabel, libraryStatuses, safeWatchLink, type LibraryRow } from '@/lib/library-editor';
import { slugify } from '@/lib/utils';
import LibraryEditor from './LibraryEditor';
import styles from './LibraryTable.module.css';
import { getCatalogStatusLabel } from '@/lib/media-status';
import { LIBRARY_STATUS_GROUPS } from '@/lib/library-filters';

const publicationColors: Record<string, string> = {
  RELEASING: 'var(--status-watching)', FINISHED: 'var(--status-completed)',
  HIATUS: 'var(--status-on_hold)', CANCELLED: 'var(--status-dropped)',
  NOT_YET_RELEASED: 'var(--status-plan_to_watch)',
};

export default function LibraryTable({ rows }: { rows: LibraryRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editors, setEditors] = useState<LibraryRow[]>([]);
  const edit = (row: LibraryRow) => {
    setEditors(current => current.some(item => item.id === row.id) ? current : [...current, row]);
    setEditingId(row.id);
  };
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const remove = (row: LibraryRow) => {
    if (!confirm('¿Quitar “' + row.title + '” de favoritos? Se conservarán el progreso, la nota y sus colecciones.')) return;
    setError(''); setMessage('');
    startTransition(async () => {
      try {
        const result = await removeLibraryFavorite(row.id);
        if (result.error) setError(result.error);
        else { setMessage('Quitado de favoritos. El progreso y las colecciones se conservan.'); router.refresh(); }
      } catch { setError('No pudimos quitar el favorito. Volvé a intentar.'); }
    });
  };
  const icon = 'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35';
  return <div className={styles.surface}>
    {message && <p role="status" className="mb-3 text-sm text-primary">{message}</p>}
    {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
    {rows.length === 0 ? <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">No hay títulos en esta vista. Probá otra búsqueda o agregá títulos desde el catálogo.</div> :
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className={styles.table}><caption className="sr-only">Títulos de la lista, notas personales, puntuación y progreso</caption>
        <thead><tr><th scope="col">Título</th><th scope="col">Mi nota</th><th scope="col">Score</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{rows.map(row => {
          const status = libraryStatuses.find(status => status.value === row.status);
          const publicationGroup = Object.entries(LIBRARY_STATUS_GROUPS).find(([, values]) => values.some(value => value.toLowerCase() === row.catalogStatus?.trim().toLowerCase()))?.[0];
          const publicationLabel = getCatalogStatusLabel(row.catalogStatus, row.type).replace('Publicación finalizada', 'Finalizada').replace('En publicación', 'En curso');
          const link = safeWatchLink(row.watchLink);
          const scoreColor = row.score != null && row.score > 0 ? row.score >= 8 ? 'var(--score-high)' : row.score >= 6 ? 'var(--score-mid)' : 'var(--score-low)' : 'var(--muted-foreground)';
          return <tr key={row.id}>
            <td><Link href={'/' + row.type + '/' + row.malId + '-' + slugify(row.title)} className="group flex items-center gap-3">
              <div className="relative h-[76px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-muted">{row.image && <Image src={row.image} alt="" fill sizes="52px" className="object-cover" />}</div>
              <div className="min-w-0"><span className="text-sm font-semibold group-hover:text-primary">{row.title}</span><span className="mt-1 block text-xs text-muted-foreground">{formatLabel(row.type,row.format)}</span></div>
            </Link></td>
            <td><p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.note || 'Sin nota'}</p></td>
            <td><span className="font-mono text-sm" style={{color:scoreColor}}>{row.score && row.score > 0 ? row.score.toFixed(1) : '—'}</span></td>
            <td><span className={styles.chip} style={{color:status ? 'var(--status-' + status.value + ')' : 'var(--muted-foreground)'}}>
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
              {row.status === 'watching' ? (row.type === 'manga' ? 'CAP ' : 'EP ') + row.episode + '/' + (row.total || '?') : status ? row.type === 'manga' ? status.manga : status.label : 'Sin estado'}
            </span>
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="block text-[10px] uppercase tracking-wider">{row.type === 'manga' ? 'Publicación' : 'Emisión'}</span>
                <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: publicationGroup ? publicationColors[publicationGroup] : 'var(--muted-foreground)' }} />{publicationLabel}</span>
              </div>
            </td>
            <td><div className="flex flex-wrap items-center">
              <button type="button" className={icon} disabled={pending} onClick={() => remove(row)} aria-label={'Quitar de favoritos: ' + row.title} title="Quitar de favoritos"><span aria-hidden="true" className="material-symbols-outlined text-lg">heart_minus</span></button>
              <button type="button" className={icon} onClick={() => edit(row)} aria-label={'Editar: ' + row.title} title="Editar"><span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span></button>
              {link ? <a href={link} target="_blank" rel="noopener noreferrer" className={icon} aria-label={'Abrir enlace personal de ' + row.title} title="Abrir enlace personal"><span aria-hidden="true" className="material-symbols-outlined text-lg">open_in_new</span></a> :
              <button type="button" className={icon} disabled aria-label={'Sin enlace personal: ' + row.title} title="Agregá un enlace desde Editar"><span aria-hidden="true" className="material-symbols-outlined text-lg">open_in_new</span></button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    {/* Keep each editing session alive when its dialog closes, including queued progress. */}
    {editors.map(row => <LibraryEditor key={row.id} row={row} open={editingId === row.id} onClose={() => setEditingId(null)} onReopen={() => setEditingId(row.id)} onSaved={() => router.refresh()} />)}
  </div>;
}
