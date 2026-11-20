'use client';

import { createHentaiEntry, updateHentaiEntry } from '@/lib/actions/hentai';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { HentaiEntry } from '@/interfaces/hentai';

interface HentaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: HentaiEntry;
  sourceAnimes?: string[];
}

export default function HentaiModal({ isOpen, onClose, entry, sourceAnimes = [] }: Readonly<HentaiModalProps>) {
  const { success } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState(entry?.is_original ? 'original' : entry?.source_anime ? 'anime' : 'unspecified');
  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError('');
    try {
      const result = entry
        ? await updateHentaiEntry(entry.id, entry.revision ?? '', formData)
        : await createHentaiEntry(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      success(entry ? 'Cambios guardados.' : 'Título agregado a tu colección.');
      router.refresh();
      onClose();
    } catch {
      setError('No pudimos guardar. Revisá tu conexión y volvé a intentar.');
    } finally {
      setLoading(false);
    }
  }

  const close = () => { if (!loading) onClose(); };
  const field = 'mt-2 min-h-11 w-full rounded-(--radius-control) border border-border bg-background px-3 py-2 text-sm text-foreground';
  const linkedType = entry?.mal_id != null;

  return (
    <Modal onClose={close} label={entry ? 'Editar título de Hentai' : 'Agregar título a Hentai'} className="p-0!">
      <aside className="ml-auto flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-card p-5 sm:p-7" onClick={event => event.stopPropagation()}>
        <header className="mb-6 flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{entry ? 'Editar título' : 'Agregar título'}</h2><p className="mt-2 text-sm text-muted-foreground">Guardá los datos de tu colección privada.</p></div>
          <button type="button" onClick={close} disabled={loading} aria-label="Cerrar formulario" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-xl disabled:opacity-40">×</button>
        </header>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
          <fieldset disabled={loading} className="space-y-5">
            <label className="block text-sm font-semibold" htmlFor="hentai-title">Título
              <input id="hentai-title" name="title" required maxLength={300} defaultValue={entry?.title ?? ''} className={field} />
            </label>
            <label className="block text-sm font-semibold" htmlFor="hentai-type">Tipo
              <select id="hentai-type" name={linkedType ? undefined : 'type'} disabled={linkedType || loading} defaultValue={entry?.type ?? 'anime'} className={field}>
                <option value="anime">Anime</option><option value="doujin">Doujin/Manga</option>
              </select>
            </label>
            {linkedType && <><input type="hidden" name="type" value={entry.type} /><p className="text-xs text-muted-foreground">El tipo de los títulos del catálogo se conserva.</p></>}
            <label className="block text-sm font-semibold" htmlFor="hentai-origin">Origen
              <select id="hentai-origin" name="origin_kind" value={origin} onChange={event => setOrigin(event.target.value)} className={field}>
                <option value="unspecified">Sin especificar</option><option value="original">Original</option><option value="anime">Pertenece a un anime</option>
              </select>
            </label>
            <div hidden={origin !== 'anime'}>
              <label className="block text-sm font-semibold" htmlFor="hentai-source-anime">Anime de origen
                <input id="hentai-source-anime" name="source_anime" list="hentai-source-animes" required={origin === 'anime'} disabled={origin !== 'anime' || loading} maxLength={200} defaultValue={entry?.source_anime ?? ''} placeholder="Ej.: Naruto" className={field} aria-describedby="hentai-source-help" />
              </label>
              <datalist id="hentai-source-animes">{sourceAnimes.map(source => <option key={source} value={source} />)}</datalist>
              <p id="hentai-source-help" className="mt-2 text-xs text-muted-foreground">Elegí uno guardado o escribí otro. Aparecerá en los filtros al guardar.</p>
            </div>
            <label className="block text-sm font-semibold" htmlFor="hentai-image">URL de la portada
              <input id="hentai-image" name="image" type="url" maxLength={2000} defaultValue={entry?.image ?? ''} placeholder="https://ejemplo.com/portada.jpg" className={field} />
            </label>
            <label className="block text-sm font-semibold" htmlFor="hentai-note">Mi nota
              <textarea id="hentai-note" name="description" rows={6} maxLength={10000} defaultValue={entry?.description ?? ''} placeholder="Agregá una nota personal…" className={field + ' resize-y'} />
            </label>
            <label className="block text-sm font-semibold" htmlFor="hentai-link">Enlace para ver o leer
              <input id="hentai-link" name="watch_link" type="url" maxLength={2000} defaultValue={entry?.watch_link ?? ''} placeholder="https://ejemplo.com/serie" className={field} />
            </label>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-border bg-background p-3 text-sm">{error}</p>}
          <footer className="mt-auto flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <button type="button" disabled={loading} onClick={close} className="min-h-11 rounded-(--radius-control) border border-border px-4 text-sm font-semibold disabled:opacity-40">Cancelar</button>
            <button type="submit" disabled={loading} className="min-h-11 rounded-(--radius-control) bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">{loading ? 'Guardando…' : entry ? 'Guardar cambios' : 'Agregar título'}</button>
          </footer>
        </form>
      </aside>
    </Modal>
  );
}
