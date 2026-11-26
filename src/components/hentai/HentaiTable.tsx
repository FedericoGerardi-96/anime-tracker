'use client';

import { useState } from 'react';
import Image from 'next/image';
import { safeWatchLink } from '@/lib/library-editor';
import type { HentaiEntry } from '@/interfaces/hentai';
import HentaiModal from './HentaiModal';
import DeleteHentaiButton from './DeleteHentaiButton';
import styles from './HentaiTable.module.css';

export default function HentaiTable({ entries, sourceAnimes = [], availableTags }: {
  entries: HentaiEntry[]; sourceAnimes?: string[]; availableTags: readonly string[];
}) {
  const [editing, setEditing] = useState<HentaiEntry | null>(null);
  const actionClass = 'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35';
  return <>
    <div className="overflow-hidden rounded-(--radius-panel) border border-border bg-card">
      <table className={styles.table}>
        <caption className="sr-only">Tu colección privada de Hentai, notas personales y acciones</caption>
        <thead><tr><th scope="col">Título</th><th scope="col">Mi nota</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{entries.map(entry => {
          const image = safeWatchLink(entry.image);
          const link = safeWatchLink(entry.watch_link);
          return <tr key={entry.id}>
            <td><div className="flex min-w-0 items-center gap-3">
              <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">{image && <Image src={image} alt="" fill sizes="44px" unoptimized className="object-cover" />}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{entry.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.type === 'anime' ? 'Anime' : 'Doujin/Manga'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.is_original ? 'Original' : entry.source_anime ? `Anime de origen: ${entry.source_anime}` : 'Origen sin especificar'}</p>
                {entry.tags.length > 0 && <ul aria-label="Etiquetas" className="mt-2 flex flex-wrap gap-1.5">
                  {entry.tags.map(tag => <li key={tag} className="max-w-full rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">{tag}</li>)}
                </ul>}
              </div>
            </div></td>
            <td><p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{entry.description || 'Sin nota'}</p></td>
            <td><div className="flex flex-wrap items-center justify-end">
              <button type="button" onClick={() => setEditing(entry)} className={actionClass} aria-label={`Editar ${entry.title}`} title="Editar"><span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span></button>
              {link ? <a href={link} target="_blank" rel="noopener noreferrer" className={actionClass} aria-label={`Abrir enlace de ${entry.title}`} title="Abrir enlace"><span aria-hidden="true" className="material-symbols-outlined text-lg">open_in_new</span></a>
                : <button type="button" disabled className={actionClass} aria-label={`Sin enlace para ${entry.title}`} title="Agregá un enlace desde Editar"><span aria-hidden="true" className="material-symbols-outlined text-lg">open_in_new</span></button>}
              <DeleteHentaiButton id={entry.id} title={entry.title} />
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {editing && <HentaiModal isOpen entry={editing} sourceAnimes={sourceAnimes} availableTags={availableTags} onClose={() => setEditing(null)} />}
  </>;
}
