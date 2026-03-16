import React from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';

export interface AnimeCardProps {
  id: number | string;
  title: string;
  image: string;
  score: number;
  studio: string;
  year: number;
  isAiring?: boolean;
  isFavorite?: boolean;
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
}: AnimeCardProps) {
  const slug = `${id}-${slugify(title)}`;

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <Link href={`/anime/${slug}`}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
            style={{ backgroundImage: `url('${image}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        
        {isAiring && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary/80 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider pointer-events-none">
            Airing
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300 z-10">
          <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-transform group/fav cursor-pointer">
            <span 
              className={`material-symbols-outlined text-lg transition-colors ${isFavorite ? 'text-red-500' : 'group-hover:text-red-500'}`}
              style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
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
      
      <Link href={`/anime/${slug}`}>
        <h3 className="font-bold text-sm leading-tight line-clamp-1 text-slate-900 dark:text-slate-100 hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {studio} • {year}
        </p>
      </Link>
    </div>
  );
}

