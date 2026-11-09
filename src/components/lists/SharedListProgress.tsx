'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLibraryEditor } from '@/lib/actions/library-editor';
import { libraryStatuses, type LibraryStatus } from '@/lib/library-editor';
import { useToast } from '@/components/ui/Toast';
import styles from './SharedListView.module.css';

interface Props {
  id: string;
  title: string;
  type: 'anime' | 'manga';
  total: number | null;
  initial: { status: string | null; episode: number; revision: string | null; exists: boolean };
}

export default function SharedListProgress({ id, title, type, total, initial }: Props) {
  const [progress, setProgress] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const status = libraryStatuses.find(entry => entry.value === progress.status)?.value ?? '';
  const watching = status === 'watching';

  function save(next: LibraryStatus, episode: number) {
    startTransition(async () => {
      try {
        const result = await saveLibraryEditor(id, { exists: progress.exists, revision: progress.revision }, {
          kind: 'progress', status: next, episode,
        });
        if ('error' in result) toast.error(result.error);
        else {
          setProgress(result.data);
          router.refresh();
        }
      } catch {
        toast.error('No pudimos guardar tu progreso. Volvé a intentar.');
      }
    });
  }

  return <div className={styles.progress + ' flex flex-wrap items-center gap-1.5'} data-status={status}>
    <div className={styles.chip + ' relative max-w-full'} data-empty={!status || undefined}>
      <span aria-hidden="true" className="pointer-events-none absolute left-2.5 size-2 rounded-full bg-current" />
      <select aria-label={'Cambiar estado de ' + title} value={status} disabled={pending} className="min-h-[inherit] max-w-full"
        onChange={event => {
          const next = libraryStatuses.find(entry => entry.value === event.target.value);
          if (next) save(next.value, progress.episode);
        }}>
        <option value="" disabled>Agregar</option>
        {libraryStatuses.map(entry => <option value={entry.value} key={entry.value}>
          {entry.value === 'completed' ? (type === 'manga' ? 'Ya lo leíste' : 'Ya la viste') : type === 'manga' ? entry.manga : entry.label}
        </option>)}
      </select>
    </div>
    {watching && <span className="inline-flex min-h-11 items-center gap-1.5 rounded-[9px] border border-border bg-card px-2 font-mono text-[11px] text-muted-foreground lg:min-h-[30px]">
      {type === 'manga' ? 'CAP' : 'EP'} <b className="text-foreground">{progress.episode}</b>{total ? ' /' + total : ''}
      <button type="button" disabled={pending || progress.episode >= (total ?? 1000000)} onClick={() => save('watching', progress.episode + 1)}
        aria-label={'Sumar ' + (type === 'manga' ? 'un capítulo a ' : 'un episodio a ') + title}
        className="inline-grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-md bg-primary/10 font-bold text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40 lg:min-h-7 lg:min-w-7">+1</button>
    </span>}
  </div>;
}
