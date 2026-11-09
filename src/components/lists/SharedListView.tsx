'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/auth/AuthModal';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { copySharedList, followSharedList, unfollowSharedList } from '@/lib/actions/list-sharing';
import { FOLLOWED_LISTS_PATH, ownedListPath, sharedListPath } from '@/lib/list-sharing';
import styles from './SharedListView.module.css';

const primary = styles.button + ' ' + styles.primary;
const secondary = styles.button + ' ' + styles.secondary;

function followIntent(key: string, expires?: number) {
  try {
    if (expires !== undefined) sessionStorage.setItem(key, String(expires));
    else {
      const value = Number(sessionStorage.getItem(key));
      sessionStorage.removeItem(key);
      return value > Date.now();
    }
  } catch {
    // The explicit follow button remains available if storage is blocked.
    return false;
  }
  return false;
}

interface Props {
  id: string;
  slug: string;
  title: string;
  owner: string;
  viewer: 'owner' | 'member' | 'guest';
  following: boolean | null;
  header: ReactNode;
  children: ReactNode;
}

export default function SharedListView({ id, slug, title, owner, viewer, following, header, children }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [auth, setAuth] = useState<'follow' | 'copy' | null>(null);
  const [manualLink, setManualLink] = useState('');
  const [pending, startTransition] = useTransition();
  const copyId = useRef<string | null>(null);
  const path = sharedListPath(slug);
  const intentKey = 'anitrack:follow:' + slug;
  const initials = owner.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();

  useEffect(() => {
    if (viewer !== 'member') return;
    if (!followIntent(intentKey) || following) return;
    startTransition(async () => {
      try {
        const result = await followSharedList(slug);
        if (result.error) toast.error(result.error);
        else {
          toast.success('Ahora seguís la lista. La encontrás en De amigos.');
          router.refresh();
        }
      } catch {
        toast.error('No pudimos seguir la lista. Volvé a intentar.');
      }
    });
  }, [viewer, following, intentKey, slug, router, toast]);

  function requestAuth(action: 'follow' | 'copy') {
    if (action === 'follow') followIntent(intentKey, Date.now() + 15 * 60 * 1000);
    setAuth(action);
  }

  function toggleFollow() {
    if (viewer === 'guest') return requestAuth('follow');
    startTransition(async () => {
      try {
        const result = following ? await unfollowSharedList(id) : await followSharedList(slug);
        if (result.error) toast.error(result.error);
        else {
          toast.success(following ? 'Dejaste de seguir la lista.' : 'Ahora seguís la lista. La encontrás en De amigos.');
          router.refresh();
        }
      } catch {
        toast.error('No pudimos guardar el seguimiento. Volvé a intentar.');
      }
    });
  }

  function makeCopy() {
    if (viewer === 'guest') return requestAuth('copy');
    const requestId = copyId.current ?? crypto.randomUUID();
    copyId.current = requestId;
    startTransition(async () => {
      try {
        const result = await copySharedList(slug, requestId);
        if (!result.id) toast.error(result.error ?? 'No pudimos crear la copia.');
        else {
          copyId.current = null;
          toast.success('La copia está lista en Mis listas.');
          router.push(ownedListPath(result.id));
        }
      } catch {
        toast.error('No pudimos crear la copia. Volvé a intentar.');
      }
    });
  }

  async function share() {
    const url = new URL(path, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setManualLink(url);
    }
  }

  return <article className={styles.layout}>
    <section className={styles.content} aria-label="Lista compartida">
      {header}
      <div className="flex flex-wrap items-center gap-2.5">
        {viewer === 'owner' ? <>
          <Link href={ownedListPath(id)} className={primary}>Volver a editar</Link>
          <p className="text-xs text-muted-foreground">Así la ven los demás.</p>
        </> : <>
          <button type="button" disabled={pending || following === null} onClick={toggleFollow} aria-pressed={Boolean(following)}
            className={following ? secondary + ' ' + styles.following : primary}>
            <span aria-hidden="true" className="material-symbols-outlined text-lg">{following ? 'check' : 'add'}</span>
            {following ? 'Siguiendo' : 'Seguir lista'}
          </button>
          <button type="button" disabled={pending} onClick={makeCopy} className={secondary}>
            <span aria-hidden="true" className="material-symbols-outlined text-lg">content_copy</span>Hacer una copia
          </button>
        </>}
        <button type="button" onClick={share} className={styles.button + ' ' + styles.icon} aria-label="Compartir">
          <span aria-hidden="true" className="material-symbols-outlined text-lg">share</span>
        </button>
        {viewer !== 'owner' && <p className="min-w-0 flex-[1_1_260px] text-xs leading-relaxed text-muted-foreground">
          <b>Seguir</b> guarda la lista en De amigos y muestra los cambios del original. <b>Copia</b> crea una lista tuya que podés editar.
        </p>}
        <span className="sr-only" role="status">{pending ? 'Guardando…' : ''}</span>
      </div>
      {following === null && <p role="status" className="text-sm text-muted-foreground">No pudimos comprobar si seguís esta lista. Recargá para reintentar.</p>}
      {children}
    </section>
    <aside className={styles.aside}>
      <p className={styles.eyebrow}>{viewer === 'guest' ? 'Guardá esta lista' : 'Lista compartida'}</p>
      <div className={styles.panel}>
        <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <span className={styles.avatar + ' size-8'} aria-hidden="true"><span>{initials}</span></span>
          <span className="min-w-0 break-words"><b className="text-foreground">{owner}</b> {viewer === 'owner' ? 'es quien creó la lista' : 'compartió esta lista'}</span>
        </p>
        <p className="break-words text-[17px] font-extrabold">{title}</p>
        {viewer === 'guest' ? <>
          <p className="text-[13px] leading-relaxed text-muted-foreground">Podés ver toda la lista. Para guardarla y seguir tu progreso, iniciá sesión o creá una cuenta.</p>
          <button type="button" className={primary + ' w-full'} onClick={() => requestAuth('follow')}>Guardar lista</button>
          <p className="text-xs leading-relaxed text-muted-foreground">Las listas que seguís aparecen en Listas › De amigos.</p>
        </> : <Link href={viewer === 'owner' ? ownedListPath(id) : FOLLOWED_LISTS_PATH} className={secondary + ' w-full'}>
          {viewer === 'owner' ? 'Abrir en Mis listas' : 'Abrir De amigos'}
        </Link>}
      </div>
    </aside>
    {auth && <AuthModal isOpen initialMode={auth === 'follow' ? 'signup' : 'login'} returnTo={path}
      onAuthenticated={() => setAuth(null)} onClose={() => { followIntent(intentKey); setAuth(null); }} />}
    {manualLink && <Modal label="Copiar link de la lista" onClose={() => setManualLink('')}>
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5">
        <label htmlFor="shared-list-copy" className="block font-bold">Copiá el link de la lista</label>
        <input id="shared-list-copy" readOnly value={manualLink} onFocus={event => event.currentTarget.select()}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm" />
        <button type="button" className={secondary} onClick={() => setManualLink('')}>Cerrar</button>
      </section>
    </Modal>}
  </article>;
}
