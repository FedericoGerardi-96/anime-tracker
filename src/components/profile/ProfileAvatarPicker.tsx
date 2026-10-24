'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { selectProfileAvatar } from '@/lib/actions/profile-avatar';
import { BUILT_IN_PROFILE_AVATARS, profileAvatarBackground } from '@/lib/profile-avatar';
import type { ProfileAvatarOption } from '@/interfaces/profile-avatar';

interface Props {
  avatar: string;
  options: ProfileAvatarOption[];
  verified: boolean;
  profileName: string;
  editable: boolean;
}

export default function ProfileAvatarPicker({ avatar, options, verified, profileName, editable }: Readonly<Props>) {
  const router = useRouter();
  const [currentAvatar, setCurrentAvatar] = useState(avatar);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const choices = [...BUILT_IN_PROFILE_AVATARS, ...options];
  const selected = choices.find((option) => option.id === selectedId);
  const grouped = choices.reduce((groups, option) => {
    const collection = groups.get(option.collection_title) ?? [];
    collection.push(option);
    groups.set(option.collection_title, collection);
    return groups;
  }, new Map<string, ProfileAvatarOption[]>());
  const collections = Array.from(grouped);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, pending]);

  const showPicker = () => {
    setSelectedId(choices.find((option) => option.image_url === currentAvatar)?.id ?? null);
    setError(null);
    setOpen(true);
  };

  const save = () => {
    if (!selected || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await selectProfileAvatar(selected.id);
        if (result.error) {
          setError(result.error);
          return;
        }
        setCurrentAvatar(selected.image_url);
        setOpen(false);
        router.refresh();
      } catch {
        setError('No pudimos guardar la imagen. Revisá tu conexión e intentá de nuevo.');
      }
    });
  };

  return <>
    <div className="relative shrink-0">
      <div role="img" aria-label={`Imagen de perfil de ${profileName}`} className="size-40 rounded-3xl border-2 border-border bg-cover bg-center shadow-2xl" style={{ backgroundImage: profileAvatarBackground(currentAvatar) }} />
      {verified && <span className="absolute -right-2 -top-2 flex rounded-xl bg-primary p-2 text-primary-foreground shadow-lg"><span className="material-symbols-outlined text-xl">verified</span></span>}
      {editable && <button type="button" onClick={showPicker} className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground shadow-lg transition hover:border-primary hover:text-primary"><span className="material-symbols-outlined text-base">edit</span>Cambiar foto</button>}
    </div>

    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="avatar-picker-title" className="flex max-h-[min(90vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-2xl">
        <div className="flex items-start gap-4 border-b border-border p-5 sm:p-7">
          <div className="size-20 shrink-0 rounded-full border-2 border-primary/30 bg-cover bg-center" style={{ backgroundImage: profileAvatarBackground(selected?.image_url ?? currentAvatar) }} />
          <div className="min-w-0 flex-1"><h2 id="avatar-picker-title" className="text-xl font-black sm:text-2xl">Elegí tu imagen de perfil</h2><p className="mt-1 text-sm text-muted-foreground">Seleccioná un avatar de la colección. Podés cambiarlo cuando quieras.</p></div>
          <button type="button" autoFocus disabled={pending} onClick={() => setOpen(false)} aria-label="Cerrar selector de imágenes" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5 sm:p-7">
          {collections.map(([title, items]) => <section key={title} aria-label={title}><h3 className="mb-4 text-sm font-black uppercase tracking-wider text-foreground">{title}</h3><div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6">
            {items.map((option) => <button key={option.id} type="button" disabled={pending} aria-label={option.name} aria-pressed={selectedId === option.id} title={option.name} onClick={() => setSelectedId(option.id)} className={`relative mx-auto size-20 rounded-full bg-muted bg-cover bg-center ring-4 ring-offset-2 ring-offset-card transition hover:scale-105 sm:size-24 ${selectedId === option.id ? 'ring-primary' : 'ring-transparent hover:ring-primary/30'}`} style={{ backgroundImage: profileAvatarBackground(option.image_url) }}>{selectedId === option.id && <span className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><span className="material-symbols-outlined text-base">check</span></span>}</button>)}
          </div></section>)}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-background/50 p-5 sm:px-7">{error && <p role="alert" className="mr-auto text-sm text-red-500">{error}</p>}<button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:bg-muted">Cancelar</button><button type="button" disabled={!selected || pending || selected.image_url === currentAvatar} onClick={save} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{pending ? 'Guardando…' : 'Guardar imagen'}</button></div>
      </div>
    </div>}
  </>;
}
