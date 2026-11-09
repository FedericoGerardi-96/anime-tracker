'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import { setListVisibility } from '@/lib/actions/list-sharing';
import { sharedListPath, type ListShareSettings, type ListVisibility } from '@/lib/list-sharing';
import styles from './ShareListButton.module.css';

const options = [
  { value: 'private', label: 'Privada', description: 'Solo vos la ves.' },
  { value: 'link', label: 'Cualquiera con el link', description: 'Quien tenga el link puede verla. No aparece en tu perfil.' },
  { value: 'public', label: 'Pública en mi perfil', description: 'Disponible para tu perfil público y para compartir por link.' },
] as const;

const primary = 'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50';

export default function ShareListButton({ listId, initialSettings }: { listId: string; initialSettings: ListShareSettings | null }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState('');
  const [confirmedSettings, setConfirmedSettings] = useState<{ initial: ListShareSettings | null; saved: ListShareSettings } | null>(null);
  const settings = confirmedSettings?.initial === initialSettings ? confirmedSettings.saved : initialSettings;
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const link = settings?.slug ? origin + sharedListPath(settings.slug) : '';

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  function changeVisibility(visibility: ListVisibility) {
    if (pending || visibility === settings?.visibility) return;
    setCopied(false);
    setError('');
    startTransition(async () => {
      try {
        const result = await setListVisibility(listId, visibility);
        if (result.settings) setConfirmedSettings({ initial: initialSettings, saved: result.settings });
        else setError(result.error ?? 'No pudimos guardar la privacidad.');
      } catch {
        setError('No pudimos guardar la privacidad. Volvé a intentar.');
      }
    });
  }

  async function copyLink() {
    setError('');
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
      setError('El link quedó seleccionado. Copialo manualmente.');
    }
  }

  return <>
    <button type="button" className={primary} aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      setOrigin(window.location.origin);
      setCopied(false);
      setOpen(true);
    }}>
      <span aria-hidden="true" className="material-symbols-outlined text-lg">share</span>Compartir
    </button>
    {open && <Modal label="Compartir lista" onClose={() => setOpen(false)} className="open:items-end! p-2! sm:open:items-center! sm:p-4!">
      <section className={styles.panel + ' w-full max-w-[560px] space-y-5 overflow-y-auto rounded-[20px] border border-border bg-card p-4 shadow-2xl sm:p-6'}>
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold sm:text-2xl">Compartir lista</h2>
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
          </button>
        </header>
        {settings ? <>
          <fieldset disabled={pending} className="space-y-2 disabled:opacity-70">
            <legend className="sr-only">Quién puede verla</legend>
            {options.map(option => <label key={option.value} className={styles.option + ' flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3'}>
              <input type="radio" name={id} value={option.value} checked={settings.visibility === option.value}
                onChange={() => changeVisibility(option.value)} className="mt-0.5 size-5 shrink-0 accent-primary" />
              <span className="space-y-1">
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
              </span>
            </label>)}
          </fieldset>
          {link ? <div className="space-y-2">
            <label htmlFor={id + '-link'} className="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Link de la lista</label>
            <div className="flex flex-wrap gap-2">
              <input id={id + '-link'} ref={input} readOnly value={link} onFocus={event => event.currentTarget.select()}
                className="min-h-11 min-w-0 flex-1 basis-48 rounded-xl border border-border bg-background px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-primary" />
              <button type="button" className={primary} disabled={pending} onClick={copyLink}>{copied ? 'Copiado' : 'Copiar link'}</button>
            </div>
          </div> : <p className="rounded-xl border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            Las listas privadas solo las ves vos. Si volvés privada una lista compartida, su link deja de funcionar.
          </p>}
          <p role="status" className={pending ? 'text-sm text-muted-foreground' : 'sr-only'}>{pending ? 'Guardando privacidad…' : copied ? 'Link copiado.' : ''}</p>
        </> : <p role="alert" className="text-sm text-muted-foreground">No pudimos cargar la privacidad. Actualizá la página y volvé a intentar.</p>}
        {error && <p role="alert" className="text-sm text-foreground">{error}</p>}
      </section>
    </Modal>}
  </>;
}
