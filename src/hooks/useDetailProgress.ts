'use client';

import { useEffect, useState, useTransition } from 'react';
import { saveLibraryEditor } from '@/lib/actions/library-editor';
import type { LibraryStatus } from '@/lib/library-editor';

export interface DetailProgress {
  status: string; current_episode: number | null; mediaId: string; revision: string | null;
}
type Draft = { status: LibraryStatus; episode: string };

export function useDetailProgress(initial: DetailProgress | null, max: number) {
  const [snapshot, setSnapshot] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const episode = draft?.episode ?? String(snapshot?.current_episode ?? 0);
  const status = draft?.status ?? snapshot?.status ?? '';
  const valid = /^\d+$/.test(episode) && Number.isSafeInteger(Number(episode)) && Number(episode) <= (max || 1000000);
  useEffect(() => {
    if (!draft || !snapshot || !valid || pending || error) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await saveLibraryEditor(snapshot.mediaId, { exists: true, revision: snapshot.revision }, { kind: 'progress', status: draft.status, episode: Number(draft.episode) });
          if ('error' in result) { setError(result.error); return; }
          setSnapshot({ mediaId: snapshot.mediaId, status: result.data.status ?? 'watching', current_episode: result.data.episode, revision: result.data.revision });
          setDraft(current => current === draft ? null : current);
          setSaved(true);
        } catch { setError('No pudimos guardar el progreso. Tu cambio sigue acá para reintentar.'); }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, snapshot, valid, pending, error]);
  useEffect(() => {
    if (!draft && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, pending]);
  return { episode, status, pending, error, valid, ready: Boolean(snapshot), dirty: Boolean(draft), saved: saved && !draft && !pending,
    change(value: string, nextStatus: LibraryStatus = 'watching') {
      setError(''); setSaved(false); setDraft({ episode: value, status: nextStatus });
    },
    reset(value: DetailProgress | null) { setSnapshot(value); setDraft(null); setError(''); setSaved(false); },
    retry() { setError(''); },
  };
}
