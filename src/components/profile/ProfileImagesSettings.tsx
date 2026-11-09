'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { profileAvatarBackground } from '@/lib/profile-avatar';
import { PROFILE_IMAGE_ACCEPT, PROFILE_IMAGE_INPUT_LIMIT, type ProfileImageKind } from '@/lib/profile-image';
import ProfileBanner from './ProfileBanner';

const labels = { avatar: 'Foto de perfil', cover: 'Portada' } as const;

export default function ProfileImagesSettings({ avatar, fallbackAvatar, initials, cover, available }: Readonly<{
  avatar: string | null;
  fallbackAvatar: string | null;
  initials: string;
  cover: string | null;
  available: boolean;
}>) {
  return (
    <section id="imagenes" className="max-w-3xl scroll-mt-24 space-y-5 rounded-(--radius-panel) border border-border bg-card p-5 sm:p-7" aria-labelledby="profile-images-heading">
      <header>
        <h3 id="profile-images-heading" className="font-black">Foto y portada</h3>
        <p className="mt-1 text-sm text-muted-foreground">Se ven en tu perfil público. Elegí un JPG, PNG o WebP estático de hasta 4 MB y revisá el recorte antes de guardar.</p>
      </header>
      {!available && <p role="status" className="text-sm text-muted-foreground">Las subidas de imágenes todavía no están disponibles. Probá más tarde.</p>}
      <ImageSetting kind="avatar" src={avatar} fallback={fallbackAvatar} initials={initials} available={available} />
      <ImageSetting kind="cover" src={cover} available={available} />
    </section>
  );
}

type Draft = { file: File; url: string };

function ImageSetting({ kind, src, fallback, initials, available }: Readonly<{
  kind: ProfileImageKind;
  src: string | null;
  fallback?: string | null;
  initials?: string;
  available: boolean;
}>) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [operation, setOperation] = useState<'save' | 'remove' | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => () => {
    if (draft) URL.revokeObjectURL(draft.url);
  }, [draft]);

  const choose = (file: File | undefined) => {
    setDraft(null);
    setFeedback(null);
    if (!file) return;
    if ((file.type && !PROFILE_IMAGE_ACCEPT.split(',').includes(file.type)) || file.size > PROFILE_IMAGE_INPUT_LIMIT || file.size === 0) {
      if (input.current) input.current.value = '';
      setFeedback({ error: true, text: 'Elegí un JPG, PNG o WebP de hasta 4 MB.' });
      return;
    }
    setDraft({ file, url: URL.createObjectURL(file) });
  };

  const save = async (mode: 'save' | 'remove') => {
    if (operation || (mode === 'save' && !draft)) return;
    setOperation(mode);
    setFeedback(null);
    const failure = 'No pudimos actualizar la imagen. Probá de nuevo.';
    try {
      const response = await fetch(`/api/profile/images/${kind}`, {
        method: mode === 'save' ? 'PUT' : 'DELETE',
        body: mode === 'save' ? draft?.file : undefined,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setFeedback({ error: true, text: typeof result?.error === 'string' ? result.error : failure });
        return;
      }
      if (input.current) input.current.value = '';
      setDraft(null);
      setFeedback({ error: false, text: mode === 'save' ? 'Imagen guardada.' : 'Imagen quitada.' });
      router.refresh();
    } catch {
      setFeedback({ error: true, text: failure });
    } finally {
      setOperation(null);
    }
  };

  const preview = draft?.url ?? src ?? fallback;
  return (
    <form className="space-y-3 border-t border-border pt-5" aria-labelledby={`${id}-label`}
      onSubmit={event => { event.preventDefault(); void save('save'); }}>
      <h4 id={`${id}-label`} className="text-sm font-extrabold">{labels[kind]}</h4>
      {kind === 'avatar' ? (
        <div role="img" aria-label="Vista previa de la foto de perfil" className="grid size-24 place-items-center rounded-full border border-border bg-muted bg-cover bg-center text-2xl font-extrabold"
          style={preview ? { backgroundImage: profileAvatarBackground(preview) } : undefined}>{preview ? null : initials}</div>
      ) : (
        <div role="img" aria-label="Vista previa de la portada">
          <ProfileBanner src={preview} className="aspect-3/1 h-auto! overflow-hidden rounded-xl" />
        </div>
      )}
      {kind === 'cover' && <p className="text-xs text-muted-foreground">El perfil centra la portada y adapta el recorte al ancho de la pantalla.</p>}
      <label htmlFor={id} className="sr-only">{kind === 'avatar' ? 'Elegir archivo para la foto de perfil' : 'Elegir archivo para la portada'}</label>
      <input ref={input} id={id} type="file" accept={PROFILE_IMAGE_ACCEPT} disabled={!available || !!operation}
        onChange={event => choose(event.target.files?.[0])}
        className="block min-h-11 w-full min-w-0 max-w-full rounded-(--radius-control) border border-border bg-background text-sm text-foreground file:me-3 file:min-h-11 file:cursor-pointer file:border-0 file:bg-accent file:px-3 file:font-bold file:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!available || !draft || !!operation}
          className="min-h-11 rounded-(--radius-control) bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {operation === 'save' ? 'Guardando…' : kind === 'avatar' ? 'Guardar foto' : 'Guardar portada'}
        </button>
        {draft ? (
          <button type="button" disabled={!!operation} onClick={() => { if (input.current) input.current.value = ''; choose(undefined); }}
            className="min-h-11 rounded-(--radius-control) border border-border px-4 text-sm font-bold disabled:opacity-50">Cancelar</button>
        ) : src && (
          <button type="button" disabled={!available || !!operation} onClick={() => void save('remove')}
            className="min-h-11 rounded-(--radius-control) border border-border px-4 text-sm font-bold disabled:opacity-50">
            {operation === 'remove' ? 'Quitando…' : kind === 'avatar' ? 'Quitar foto' : 'Quitar portada'}
          </button>
        )}
      </div>
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className="text-sm text-foreground">{feedback.text}</p>}
    </form>
  );
}
