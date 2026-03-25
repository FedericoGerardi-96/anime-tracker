"use client";

import React, { useTransition, useState, useEffect } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { toggleFavorite } from '@/lib/actions/media';
import { useToast } from '@/components/ui/Toast';
import AuthModal from '@/components/auth/AuthModal';

export interface AnimeCardProps {
  id: number | string;
  title: string;
  image: string;
  score: number;
  studio: string;
  year: number;
  isAiring?: boolean;
  isFavorite?: boolean;
  synopsis?: string;
  season?: string;
  tags?: string[];
  episodes?: number;
  type?: 'anime' | 'manga';
  userId?: string;
  onAddClick?: (anime: any) => void;
}

export default function AnimeCard({
  id,
  title,
  image,
  score,
  studio,
  year,
  isAiring = false,
  isFavorite = false,
  synopsis,
  season,
  tags,
  episodes,
  type = 'anime',
  userId,
  onAddClick
}: AnimeCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { error } = useToast();

  useEffect(() => {
    setOptimisticFavorite(isFavorite);
  }, [isFavorite]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      error('You must be logged in to favorite media');
      setIsAuthModalOpen(true);
      return;
    }
    setOptimisticFavorite(!optimisticFavorite);

    startTransition(async () => {
      const result = await toggleFavorite({
        mal_id: Number(id),
        title,
        image,
        type,
        synopsis,
        season,
        tags
      });
      // if there's an error, revert state
      if (result?.error) {
        setOptimisticFavorite(optimisticFavorite);
        error(result.error);
      }
    });
  };

  const slug = `${id}-${slugify(title)}`;

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-2/3 rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <Link href={`/${type}/${slug}`}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
            style={{ backgroundImage: `url('${image}')` }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        
        {isAiring && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary/80 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider pointer-events-none">
            Airing
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex flex-col gap-2 transition-transform duration-300 z-10">
          <button 
            onClick={(e) => {
              e.preventDefault();
              onAddClick?.({ id, title, image, score, studio, year, isAiring, synopsis, season, tags, episodes });
            }}
            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button 
            onClick={handleFavoriteClick}
            disabled={isPending}
            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-transform group/fav cursor-pointer disabled:opacity-50"
          >
            <span 
              className={`material-symbols-outlined text-lg transition-colors ${optimisticFavorite ? 'text-red-500' : 'group-hover/fav:text-red-500'}`}
              style={optimisticFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              favorite
            </span>
          </button>
        </div>
        
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 pointer-events-none">
          <span 
            className="material-symbols-outlined text-yellow-400 text-[14px]" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            star
          </span>
          <span className="text-xs font-bold text-white">{score.toFixed(2)}</span>
        </div>
      </div>
      
      <Link href={`/${type}/${slug}`}>
        <h3 className="font-bold text-sm leading-tight line-clamp-1 text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {studio} • {year}
        </p>
      </Link>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

