
'use client'

import React, { useState, useTransition, useEffect, useRef, useId } from 'react';
import { toggleFavorite } from '@/lib/actions/media';
import { addMediaToLists, getMediaProgress } from '@/lib/actions/lists';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { requestListDialog } from '@/lib/list-dialog-request';
import { useDetailProgress, type DetailProgress } from '@/hooks/useDetailProgress';
import { libraryStatuses } from '@/lib/library-editor';
import type { ListDialogResult } from '@/interfaces/list-dialog';

interface AnimeActionsProps {
  animeData: Omit<Parameters<typeof toggleFavorite>[0], 'mal_id' | 'synopsis'> & {
    id: number;
    synopsis?: string | null;
    catalogStatus?: string;
    studio?: string;
  };
  isFavorite: boolean;
  initialListIds: string[];
  initialProgress: DetailProgress | null;
  maxEpisodes?: number;
  userId?: string;
}

import { useToast } from '@/components/ui/Toast';

export default function AnimeActions({
  animeData,
  isFavorite: initialFavorite,
  initialListIds,
  initialProgress,
  maxEpisodes = 0,
  userId
}: Readonly<AnimeActionsProps>) {
  const [isPending, startTransition] = useTransition();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataPromise, setDataPromise] = useState<Promise<ListDialogResult> | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { error, warning } = useToast();

  const progress = useDetailProgress(initialProgress, maxEpisodes);
  const { status, episode } = progress;
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const busy = isPending || isSavingProgress || progress.pending || progress.dirty;
  const options = [
    { value: 'watching', label: animeData.type === 'manga' ? 'Leyendo' : 'Viendo', icon: 'play_arrow', color: 'text-emerald-400' },
    { value: 'completed', label: 'Completado', icon: 'check', color: 'text-primary' },
    { value: 'plan_to_watch', label: 'Pendiente', icon: 'schedule', color: 'text-muted-foreground' },
    { value: 'on_hold', label: 'En pausa', icon: 'pause', color: 'text-amber-400' },
    { value: 'dropped', label: 'Abandonado', icon: 'close', color: 'text-red-500' },
  ];
  const selected = options.find(option => option.value === status) ?? options[2];

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const isManga = animeData.type === 'manga';

  const [previousFavorite, setPreviousFavorite] = useState(initialFavorite);
  if (previousFavorite !== initialFavorite) {
    setPreviousFavorite(initialFavorite);
    setIsFavorite(initialFavorite);
  }

  const handleFavoriteClick = async () => {
    if (busy) return;
    if (!userId) {
      error('Please login to favorite this title');
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);

    startTransition(async () => {
      try {
        const result = await toggleFavorite({
          mal_id: animeData.id,
          title: animeData.title,
          image: animeData.image,
          type: animeData.type || 'anime',
          synopsis: animeData.synopsis ?? undefined,
          season: animeData.season,
          year: animeData.year,
          genres: animeData.genres,
          tags: animeData.tags,
          format: animeData.format,
          status: animeData.catalogStatus,
          score: animeData.score
        });
        if (result?.error) {
          setIsFavorite(!nextState);
          error(result.error);
        } else {
          setIsFavorite(result.isFavorite ?? nextState);
          if (nextState) progress.reset(await getMediaProgress(animeData.id, animeData.type || 'anime'));
          if (result?.warning) warning(result.warning);
        }
      } catch {
        setIsFavorite(!nextState);
        error('No se pudo actualizar el favorito');
      }
    });
  };

  const handleSaveProgress = async (newStatus?: string, newEpisode?: number | string) => {
    if (!userId) {
      error('Please login to track your progress');
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setIsSavingProgress(true);
    const s = newStatus ?? status;
    const e = newEpisode ?? episode;

    try {
      const result = await addMediaToLists(
        {
          mal_id: animeData.id,
          title: animeData.title,
          image: animeData.image,
          type: animeData.type || 'anime',
          synopsis: animeData.synopsis ?? undefined,
          season: animeData.season,
          year: animeData.year,
          genres: animeData.genres,
          tags: animeData.tags,
          format: animeData.format,
          status: animeData.catalogStatus,
          score: animeData.score
        },
        initialListIds,
        {
          status: s || undefined,
          current_episode: e === '' ? 0 : Number(e)
        }
      );

      if (result.error) { error(result.error); return false; }
      if (result.warning) warning(result.warning);
      if (result.success) {
        progress.reset(await getMediaProgress(animeData.id, animeData.type || 'anime'));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
      return !!result.success;
    } catch {
      error('No se pudo guardar el progreso');
      return false;
    } finally {
      setIsSavingProgress(false);
    }
  };

  const selectStatus = (newStatus: string) => {
    if (busy) return;
    setIsMenuOpen(false);
    if (!userId) { void handleSaveProgress(newStatus); return; }
    startTransition(async () => {
      if (!isFavorite) {
        try {
          const result = await toggleFavorite({ ...animeData, mal_id: animeData.id, type: animeData.type || 'anime', synopsis: animeData.synopsis ?? undefined, status: animeData.catalogStatus });
          if (result.error) { error(result.error); return; }
          setIsFavorite(result.isFavorite ?? true);
          if (result.warning) warning(result.warning);
        } catch { error('No se pudo agregar el favorito'); return; }
      }
      await handleSaveProgress(newStatus, newStatus === 'completed' && maxEpisodes > 0 ? maxEpisodes : episode);
    });
  };

  const changeEpisode = (value: string) => {
    if (!userId) { setAuthMode('login'); setIsAuthModalOpen(true); return; }
    // The existing add/status flow creates the local record before editing progress.
    if (!progress.ready) { error('Elegí un estado de seguimiento antes de registrar el progreso.'); return; }
    const nextStatus = status === 'completed' || !status || status === 'plan_to_watch'
      ? 'watching' : libraryStatuses.find(item => item.value === status)?.value ?? 'watching';
    progress.change(value, nextStatus);
  };

  return (
    <div className="relative z-20 w-full">
      <div className="flex flex-wrap items-center gap-3 detail-panel p-3 rounded-2xl">
        <div ref={menuRef} className="relative w-full sm:w-auto sm:min-w-[240px]">
          <div className={`flex overflow-hidden rounded-xl border ${isFavorite ? 'border-border bg-muted/60 dark:bg-white/5' : 'border-primary bg-primary text-primary-foreground'}`}>
            <button type="button"
              onClick={() => isFavorite ? setIsMenuOpen(!isMenuOpen) : handleFavoriteClick()}
              disabled={busy}
              aria-expanded={isFavorite ? isMenuOpen : undefined}
              aria-controls={isFavorite ? menuId : undefined}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 px-5 py-3 text-sm font-bold transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 disabled:opacity-50 cursor-pointer"
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-lg ${isFavorite ? selected.color : ''}`}>{isFavorite ? selected.icon : 'add'}</span>
              {isFavorite ? selected.label : 'Añadir a favoritos'}
            </button>
            <button type="button" aria-label="Seleccionar estado" aria-expanded={isMenuOpen} aria-controls={menuId}
              disabled={busy} onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex w-11 shrink-0 items-center justify-center border-l border-current/20 transition hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 disabled:opacity-50 cursor-pointer"
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-lg transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
          </div>
          {isMenuOpen && (
            <div id={menuId} aria-label="Estado de seguimiento" className="absolute left-0 top-full z-50 mt-2 w-full min-w-[240px] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
              {options.map(option => (
                <button type="button" key={option.value} disabled={busy} aria-pressed={isFavorite && status === option.value}
                  onClick={() => selectStatus(option.value)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50 cursor-pointer"
                >
                  <span aria-hidden="true" className={`material-symbols-outlined text-lg ${option.color}`}>{option.icon}</span>
                  <span className={`flex-1 ${isFavorite && status === option.value ? 'font-bold' : ''}`}>{option.label}</span>
                  {isFavorite && status === option.value && <span aria-hidden="true" className="material-symbols-outlined text-lg text-muted-foreground">check</span>}
                </button>
              ))}
              {isFavorite && <div className="mt-1 border-t border-border pt-1">
                <button type="button" disabled={busy} onClick={() => { setIsMenuOpen(false); void handleFavoriteClick(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 transition hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none disabled:opacity-50 cursor-pointer"
                ><span aria-hidden="true" className="material-symbols-outlined text-lg">delete</span>Quitar de mi lista</button>
              </div>}
            </div>
          )}
        </div>
        <button type="button"
          disabled={busy}
          onClick={() => {
            if (userId) {
              setDataPromise(requestListDialog(Number(animeData.id), isManga ? 'manga' : 'anime'));
              setIsModalOpen(true);
            } else {
              error('Please login to manage your lists');
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }
          }}
          className="px-4 py-3 border border-border font-semibold rounded-xl flex items-center gap-2 hover:bg-muted transition-all text-sm shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>{''}
          Listas personalizadas
        </button>

        <div className="h-10 w-px bg-muted dark:bg-white/10 mx-1 hidden sm:block"></div>

        <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-border bg-muted/60 font-mono text-sm">
          <button type="button" aria-label={isManga ? 'Restar un capítulo' : 'Restar un episodio'}
            disabled={isPending || isSavingProgress || !progress.valid || Number(episode) <= 0}
            onClick={() => changeEpisode(String(Number(episode) - 1))}
            className="h-full w-11 cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">−</button>
          <label className="flex items-center gap-1 px-2">
            <span aria-hidden="true">{isManga ? 'CAP' : 'EP'}</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={7}
              aria-label={isManga ? 'Capítulos leídos' : 'Episodios vistos'} aria-invalid={!progress.valid}
              value={episode} onChange={event => changeEpisode(event.target.value)} disabled={isPending || isSavingProgress}
              style={{ width: Math.max(2, episode.length) + 'ch' }}
              className="min-w-6 bg-transparent py-2 text-center font-semibold" />
            <span className="text-muted-foreground">/{maxEpisodes || '?'}</span>
          </label>
          <button type="button" aria-label={isManga ? 'Sumar un capítulo' : 'Sumar un episodio'}
            disabled={isPending || isSavingProgress || !progress.valid || Number(episode) >= (maxEpisodes || 1000000)}
            onClick={() => changeEpisode(String(Number(episode) + 1))}
            className="h-full w-11 cursor-pointer bg-primary/10 font-bold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40">+</button>
        </div>
        <span role="status" className="text-xs text-muted-foreground">
          {progress.pending || isSavingProgress ? 'Guardando…' : progress.dirty ? 'Cambios sin guardar' : progress.saved || showSuccess ? 'Guardado en AniTrack' : ''}
        </span>
        {!progress.valid && <p className="w-full text-sm text-muted-foreground">Ingresá un entero entre 0 y {maxEpisodes || 1000000}.</p>}
        {progress.error && <div className="w-full text-sm"><p role="alert">{progress.error}</p><button type="button" onClick={progress.retry} className="mt-2 min-h-11 cursor-pointer text-primary underline">Reintentar guardado</button></div>}

      </div>

      <AddToListModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setDataPromise(null); }}
        mode="add-anime"
        animeData={{
          mal_id: animeData.id,
          title: animeData.title,
          image: animeData.image,
          type: animeData.type || 'anime',
          synopsis: animeData.synopsis ?? undefined,
          season: animeData.season,
          tags: animeData.tags,
          episodes: maxEpisodes,
          score: animeData.score
        }}
        dataPromise={dataPromise}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
