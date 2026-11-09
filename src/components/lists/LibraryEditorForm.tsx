'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import styles from './LibraryEditor.module.css';
import { saveLibraryEditor } from '@/lib/actions/library-editor';
import { libraryStatuses, type EditorSnapshot, type LibraryEdit, type LibraryRow, type LibraryStatus } from '@/lib/library-editor';
import { slugify } from '@/lib/utils';

type ProgressDraft = { status: LibraryStatus; episode: string };

export default function LibraryEditorForm({ row, initialSnapshot, open, onClose, onReopen, onSaved }: { row: LibraryRow; initialSnapshot: EditorSnapshot; open: boolean; onClose: () => void; onReopen: () => void; onSaved: () => void }) {
  const [snapshot, setSnapshot] = useState<EditorSnapshot>(initialSnapshot);
  const [note, setNote] = useState(initialSnapshot.note);
  const [watchLink, setWatchLink] = useState(initialSnapshot.watchLink);
  const [tags, setTags] = useState(initialSnapshot.tags.join(', '));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [progressDraft, setProgressDraft] = useState<ProgressDraft | null>(null);
  const toast = useToast();
  const lastNotice = useRef<string | null>(null);
  const dirty = snapshot && (note !== snapshot.note || watchLink !== snapshot.watchLink || tags !== snapshot.tags.join(', '));
  const save = useCallback((edit: LibraryEdit, submittedDraft?: ProgressDraft) => {
    if (!snapshot || pending) return;
    setError(''); setMessage('');
    lastNotice.current = null;
    startTransition(async () => {
      try {
        const result = await saveLibraryEditor(row.id, { exists: snapshot.exists, revision: snapshot.revision }, edit);
        if ('error' in result) { setError(result.error); return; }
        setSnapshot(result.data);
        if (submittedDraft) setProgressDraft(current => current === submittedDraft ? null : current);
        if (edit.kind === 'metadata') { setNote(result.data.note); setWatchLink(result.data.watchLink); setTags(result.data.tags.join(', ')); }
        setMessage('Guardado en AniTrack.'); onSaved();
      } catch { setError('No pudimos guardar. Tus cambios siguen en el panel.'); }
    });
  }, [snapshot, pending, row.id, onSaved]);
  const total = snapshot.total;
  const episodeText = progressDraft?.episode ?? String(snapshot.episode);
  const episode = Number(episodeText);
  const validEpisode = /^\d+$/.test(episodeText) && Number.isSafeInteger(episode) && episode <= (total || 1000000);
  const selectedStatus = progressDraft?.status ?? snapshot.status;
  useEffect(() => {
    if (open || pending) return;
    const kind = error ? 'error' : (progressDraft && !validEpisode) || dirty ? 'warning' : message && !progressDraft ? 'success' : null;
    if (!kind) return;
    const text = error || (kind === 'warning' ? 'Tenés cambios sin guardar.' : message);
    const key = JSON.stringify([kind, text, snapshot.revision]);
    if (lastNotice.current === key) return;
    lastNotice.current = key;
    if (kind === 'success') toast.success(row.title + ': ' + text);
    else toast[kind](row.title + ': ' + text, { label: 'Volver a editar', onClick: onReopen });
  }, [open, pending, error, progressDraft, validEpisode, dirty, message, snapshot.revision, row.title, onReopen, toast]);
  useEffect(() => {
    if (!progressDraft || !validEpisode || pending || error) return;
    const timer = setTimeout(() => save({ kind: 'progress', status: progressDraft.status, episode: Number(progressDraft.episode) }, progressDraft), 450);
    return () => clearTimeout(timer);
  }, [progressDraft, validEpisode, pending, error, save]);
  const changeProgress = (value: string, status: LibraryStatus = 'watching') => {
    setError(''); setMessage('');
    setProgressDraft({ episode: value, status });
  };
  const control = styles.control + ' min-h-11 cursor-pointer rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary aria-pressed:border-primary aria-pressed:text-primary disabled:cursor-not-allowed disabled:opacity-50';
  const input = styles.input + ' mt-2 w-full rounded-xl border border-border bg-transparent px-3 py-3 text-sm focus:border-primary';
  const square = control + ' ' + styles.square;
  return <>
    {open && <Modal onClose={onClose} label={'Editar ' + row.title} className="p-0!">
    <aside className="ml-auto h-full w-full max-w-lg overflow-y-auto border-l border-border bg-background p-5 sm:p-6" onClick={event => event.stopPropagation()}>
      <header className="mb-8 flex items-start gap-3">
        {row.image && <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"><Image src={row.image} alt="" fill sizes="64px" className="object-cover" /></div>}
        <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold">{row.title}</h2><Link href={'/' + row.type + '/' + row.malId + '-' + slugify(row.title)} className="mt-2 inline-block text-sm text-primary">Ver ficha →</Link></div>
        <button type="button" onClick={onClose} aria-label="Cerrar editor" className={square}>×</button>
      </header>
      {snapshot && <div className="space-y-6">
        <section><h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Estado</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{libraryStatuses.map(status => <button type="button" key={status.value} aria-pressed={selectedStatus === status.value} className={control} onClick={() => changeProgress(status.value === 'completed' && total ? String(total) : episodeText, status.value)}>{row.type === 'manga' ? status.manga : status.label}</button>)}</div>
        </section>
        <section><h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Por dónde vas</h3>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
            <button type="button" className={square + ' ' + styles.step} aria-label={row.type === 'manga' ? 'Restar un capítulo' : 'Restar un episodio'} disabled={!validEpisode || episode === 0} onClick={() => changeProgress(String(episode - 1), selectedStatus === 'completed' ? 'watching' : libraryStatuses.find(s => s.value === selectedStatus)?.value ?? 'watching')}>−</button>
            <label className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 font-mono text-xs text-muted-foreground">{row.type === 'manga' ? 'Capítulo' : 'Episodio'}
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={7} aria-label={row.type === 'manga' ? 'Capítulo actual' : 'Episodio actual'} aria-invalid={!validEpisode} aria-describedby={!validEpisode ? 'episode-error' : undefined} value={episodeText} onChange={event => changeProgress(event.target.value)} className={styles.episode} style={{ width: Math.max(3, episodeText.length + 1) + 'ch' }} />
              <span>de {total || '?'}</span>
            </label>
            <button type="button" className={square + ' ' + styles.step} aria-label={row.type === 'manga' ? 'Sumar un capítulo' : 'Sumar un episodio'} disabled={!validEpisode || episode >= (total || 1000000)} onClick={() => changeProgress(String(episode + 1))}>+</button>
          </div>
          {!validEpisode && <p id="episode-error" className="mt-2 text-sm text-muted-foreground">Ingresá un número entero entre 0 y {total || 1000000}.</p>}
        </section>
        <form onSubmit={event => { event.preventDefault(); if (!progressDraft) save({kind:'metadata',note,watchLink,tags:tags.split(',').map(tag => tag.trim()).filter(Boolean)}); }} className="space-y-5">
          <label className="block text-sm text-muted-foreground">Enlace para {row.type === 'manga' ? 'leer' : 'ver'}<input type="url" maxLength={2000} value={watchLink} onChange={event => setWatchLink(event.target.value)} placeholder="https://…" className={input} disabled={pending} /></label>
          <label className="block text-sm text-muted-foreground">Mi nota<textarea value={note} onChange={event => setNote(event.target.value)} rows={5} maxLength={10000} className={input + ' resize-y'} disabled={pending} /></label>
          <label className="block text-sm text-muted-foreground">Mis etiquetas<input value={tags} onChange={event => setTags(event.target.value)} placeholder="Para ver juntos, favoritos…" className={input} disabled={pending} /><span className="mt-1 block text-xs">Separalas con comas. Hasta 30 etiquetas.</span></label>
          <button type="submit" disabled={pending || Boolean(progressDraft) || !dirty} className={control + ' text-primary'}>Guardar nota, enlace y etiquetas</button>
        </form>
      </div>}
      <p role="status" className="mt-4 text-sm text-primary">{pending ? 'Guardando…' : progressDraft ? 'Progreso sin guardar.' : message}</p>
      {error && <p role="alert" className="mt-4 text-sm text-foreground">{error}</p>}
      {error && progressDraft && validEpisode && <button type="button" disabled={pending} className={control + ' mt-3'} onClick={() => { setError(''); setMessage(''); }}>Reintentar guardado</button>}
    </aside>
  </Modal>}
  </>;
}
