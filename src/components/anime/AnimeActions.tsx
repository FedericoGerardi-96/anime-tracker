
'use client'

import React, { useState, useTransition, useEffect, useRef, useId } from 'react';
import { toggleFavorite } from '@/lib/actions/media';
import { addMediaToLists } from '@/lib/actions/lists';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { requestListDialog } from '@/lib/list-dialog-request';
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
  initialProgress: { status: string; current_episode: number | null } | null;
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
  
  const [status, setStatus] = useState(initialProgress?.status || '');
  const [episode, setEpisode] = useState<number | ''>(initialProgress?.current_episode ?? '');
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const busy = isPending || isSavingProgress;
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

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

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
          if (nextState && !status) { setStatus('plan_to_watch'); setEpisode(episode || 0); }
          if (result?.warning) warning(result.warning);
        }
      } catch {
        setIsFavorite(!nextState);
        error('No se pudo actualizar el favorito');
      }
    });
  };

  const handleSaveProgress = async (newStatus?: string, newEpisode?: number | '') => {
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
        setStatus(s || 'plan_to_watch');
        setEpisode(e);
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

  return (
    <div className="relative z-20 w-full">
      <div className="flex flex-wrap items-center gap-3 detail-panel p-3 rounded-2xl">
        <div ref={menuRef} className="relative w-full sm:w-auto sm:min-w-[240px]">
          <div className={`flex overflow-hidden rounded-xl border ${isFavorite ? 'border-border bg-muted/60 dark:bg-white/5' : 'border-primary bg-primary text-white'}`}>
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

        {/* Episode/Chapter Input */}
        <div className="flex items-center gap-2 px-3 py-1 bg-muted/60 dark:bg-white/5 rounded-xl border border-border flex-1 min-w-[120px]">
          <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0" aria-hidden="true">{isManga ? 'CH' : 'EP'}</span>
          <input 
            aria-label={isManga ? 'Capítulos leídos' : 'Episodios vistos'}
            type="number"
            value={episode}
            onChange={(e) => setEpisode(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => handleSaveProgress(undefined, episode)}
            disabled={busy}
            max={maxEpisodes > 0 ? maxEpisodes : undefined}
            min={0}
            className="bg-transparent border-none text-sm font-bold text-text-primary focus:ring-0 p-1 w-full text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {maxEpisodes > 0 && (
            <span className="text-[10px] font-bold text-muted-foreground shrink-0">/ {maxEpisodes}</span>
          )}
        </div>

        <span role="status" className="text-xs text-muted-foreground">
          {busy ? 'Guardando…' : showSuccess ? 'Guardado' : ''}
        </span>
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
