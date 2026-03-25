
'use client'

import React, { useState, useTransition, useEffect } from 'react';
import { toggleFavorite } from '@/lib/actions/media';
import { addMediaToLists } from '@/lib/actions/lists';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';

interface AnimeActionsProps {
  animeData: any;
  isFavorite: boolean;
  initialListIds: string[];
  initialProgress: any;
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
}: AnimeActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { error } = useToast();
  
  const [status, setStatus] = useState(initialProgress?.status || '');
  const [episode, setEpisode] = useState<number | ''>(initialProgress?.current_episode ?? '');
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isManga = animeData.type === 'manga';

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  const handleFavoriteClick = async () => {
    if (!userId) {
      error('Please login to favorite this title');
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);

    startTransition(async () => {
      const result = await toggleFavorite({
        mal_id: animeData.id,
        title: animeData.title,
        image: animeData.image,
        type: animeData.type || 'anime',
        synopsis: animeData.synopsis,
        season: animeData.season,
        tags: animeData.tags
      });
      if (result?.error) {
        setIsFavorite(!nextState);
        error(result.error);
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
    const s = newStatus !== undefined ? newStatus : status;
    const e = newEpisode !== undefined ? newEpisode : episode;

    const result = await addMediaToLists(
      {
        mal_id: animeData.id,
        title: animeData.title,
        image: animeData.image,
        type: animeData.type || 'anime',
        synopsis: animeData.synopsis,
        season: animeData.season,
        tags: animeData.tags
      },
      initialListIds,
      {
        status: s || undefined,
        current_episode: e === '' ? 0 : Number(e)
      }
    );
    
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setIsSavingProgress(false);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-3 glass-panel p-3 rounded-2xl">
        <button 
          onClick={() => {
            if (!userId) {
              error('Please login to manage your lists');
              setAuthMode('login');
              setIsAuthModalOpen(true);
            } else {
              setIsModalOpen(true);
            }
          }}
          className="px-6 py-3.5 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all text-sm shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add to List
        </button>

        <div className="h-10 w-px bg-white/10 mx-1 hidden sm:block"></div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/10 flex-1 min-w-[140px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Status</span>
          <select 
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatus(newStatus);
              
              let newEpisode = episode;
              if (newStatus === 'completed' && maxEpisodes > 0) {
                newEpisode = maxEpisodes;
                setEpisode(maxEpisodes);
              }
              
              handleSaveProgress(newStatus, newEpisode);
            }}
            className="bg-transparent border-none text-sm font-semibold text-text-primary focus:ring-0 p-1 w-full cursor-pointer appearance-none outline-none"
          >
            <option value="" className="bg-slate-900">Select...</option>
            <option value="watching" className="bg-slate-900">{isManga ? 'Reading' : 'Watching'}</option>
            <option value="completed" className="bg-slate-900">Completed</option>
            <option value="on_hold" className="bg-slate-900">On-Hold</option>
            <option value="dropped" className="bg-slate-900">Dropped</option>
            <option value="plan_to_watch" className="bg-slate-900">{isManga ? 'Plan to Read' : 'Plan to Watch'}</option>
          </select>
        </div>

        {/* Episode/Chapter Input */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/10 flex-1 min-w-[120px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">{isManga ? 'CH' : 'EP'}</span>
          <input 
            type="number"
            value={episode}
            onChange={(e) => setEpisode(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={() => handleSaveProgress(undefined, episode)}
            max={maxEpisodes}
            min={0}
            className="bg-transparent border-none text-sm font-bold text-text-primary focus:ring-0 p-1 w-full text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {maxEpisodes > 0 && (
            <span className="text-[10px] font-bold text-slate-600 shrink-0">/ {maxEpisodes}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <button 
            onClick={handleFavoriteClick}
            disabled={isPending}
            className={`p-3.5 rounded-xl transition-all border border-white/10 cursor-pointer ${isFavorite ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-white hover:bg-white/10'}`}
          >
            <span 
              className="material-symbols-outlined text-lg"
              style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              favorite
            </span>
          </button>
          
          <button 
            onClick={() => {
              if (isSavingProgress) return;
              handleSaveProgress();
            }}
            className={`p-3.5 rounded-xl transition-all border border-white/10 cursor-pointer ${showSuccess ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-white hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined text-lg">
              {showSuccess ? 'check_circle' : isSavingProgress ? 'sync' : 'save'}
            </span>
          </button>

          <button className="p-3.5 rounded-xl text-white hover:bg-white/10 transition-all border border-white/10 cursor-pointer hidden sm:block">
            <span className="material-symbols-outlined text-lg">share</span>
          </button>
        </div>
      </div>

      <AddToListModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="add-anime"
        animeData={{
          mal_id: animeData.id,
          title: animeData.title,
          image: animeData.image,
          type: animeData.type || 'anime',
          synopsis: animeData.synopsis,
          season: animeData.season,
          tags: animeData.tags,
          episodes: maxEpisodes
        }}
        initialListIds={initialListIds}
      />

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
