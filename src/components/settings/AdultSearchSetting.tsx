'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdultSearchPreference } from '@/lib/actions/search-preferences';

export default function AdultSearchSetting({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saved, setSaved] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const save = () => startTransition(async () => {
    setMessage(null);
    try {
      const result = await saveAdultSearchPreference(enabled);
      if (result.error) {
        setMessage({ error: true, text: result.error });
        return;
      }
      setSaved(enabled);
      setMessage({ error: false, text: 'Preferencia de búsqueda guardada.' });
      router.refresh();
    } catch {
      setMessage({ error: true, text: 'No pudimos guardar la preferencia. Intentá nuevamente.' });
    }
  });

  return (
    <section aria-labelledby="adult-search-heading" className="max-w-3xl rounded-(--radius-panel) border border-border bg-card p-5 sm:p-7">
      <h3 id="adult-search-heading" className="font-bold">Contenido +18 en búsquedas</h3>
      <p id="adult-search-description" className="mt-2 text-sm text-muted-foreground">
        Permití resultados para adultos al buscar anime y manga en AniList y MyAnimeList. La elección se guarda en tu cuenta.
      </p>
      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={enabled} disabled={pending} aria-describedby="adult-search-description"
          onChange={event => { setEnabled(event.target.checked); setMessage(null); }} className="size-5 shrink-0 accent-primary" />
        Incluir contenido +18
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {message && <p role={message.error ? 'alert' : 'status'} className="mr-auto text-sm text-foreground">{message.text}</p>}
        <button type="button" onClick={save} disabled={pending || enabled === saved}
          className="min-h-11 rounded-(--radius-control) bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">
          {pending ? 'Guardando…' : 'Guardar búsqueda'}
        </button>
      </div>
    </section>
  );
}
