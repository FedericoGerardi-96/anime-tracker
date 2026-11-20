"use client";

import React, { useTransition, useState, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { slugify } from '@/lib/utils';
import { toggleFavorite } from '@/lib/actions/media';
import { useToast } from '@/components/ui/Toast';
import AuthModal from '@/components/auth/AuthModal';
import type { MediaTitleVariants } from '@/interfaces/media-titles';
import { formatLabel, libraryStatuses, type LibraryStatus } from '@/lib/library-editor';

const statusColors: Record<LibraryStatus, string> = {
  watching: 'var(--status-viendo)',
  plan_to_watch: 'var(--status-pendiente)',
  completed: 'var(--status-completado)',
  on_hold: 'var(--status-pausa)',
  dropped: 'var(--love)',
};

export interface AnimeCardProps extends MediaTitleVariants {
  id: number | string;
  title: string;
  image: string;
  score: number;
  studio: string;
  year: number;
  isAiring?: boolean;
  isFavorite?: boolean;
  libraryStatus?: LibraryStatus;
  synopsis?: string;
  season?: string;
  genres?: string[];
  tags?: string[];
  format?: string;
  status?: string;
  episodes?: number;
  totalUnits?: number;
  type?: 'anime' | 'manga';
  userId?: string;
  onAddClick?: (anime: AnimeCardProps) => void;
  priorityImage?: boolean;
}

export default function AnimeCard({
  id,
  title,
  title_english,
  title_romaji,
  image,
  score,
  studio,
  year,
  isAiring = false,
  isFavorite = false,
  libraryStatus,
  synopsis,
  season,
  genres,
  tags,
  format,
  status,
  episodes,
  totalUnits,
  type = 'anime',
  userId,
  onAddClick,
  priorityImage = false
}: Readonly<AnimeCardProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { error, warning } = useToast();

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      error('You must be logged in to favorite media');
      setIsAuthModalOpen(true);
      return;
    }
    startTransition(async () => {
      setOptimisticFavorite(!optimisticFavorite);
      try {
        const result = await toggleFavorite({
          mal_id: Number(id),
          title,
          title_english,
          title_romaji,
          image,
          type,
          synopsis,
          season,
          year,
          genres,
          tags,
          format,
          status,
          totalUnits: totalUnits ?? episodes,
          score
        });
        if (result?.error) {
          error(result.error);
        } else {
          if (result?.warning) warning(result.warning);
          router.refresh();
        }
      } catch {
        error('No se pudo actualizar el favorito. Revisá tu conexión e intentá nuevamente.');
      }
    });
  };

  const slug = `${id}-${slugify(title)}`;
  const personalStatus = libraryStatuses.find(item => item.value === libraryStatus);

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-2/3 rounded-xl overflow-hidden shadow-xl shadow-black/20">
        <Link href={`/${type}/${slug}`} aria-label={`Ver ficha de ${title}`} className="absolute inset-0">
          {image ? <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 22vw, (max-width: 1535px) 18vw, 15vw"
            loading={priorityImage ? 'eager' : 'lazy'}
            fetchPriority={priorityImage ? 'high' : 'auto'}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          /> : <span className="absolute inset-0 bg-muted" aria-hidden="true" />}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
        
        <div className="pointer-events-none absolute top-2 left-2 right-12 flex flex-col items-start gap-1">
          <span className="max-w-full rounded bg-black/80 px-2 py-1 text-[10px] font-bold leading-tight text-white">
            {formatLabel(type, format)}
          </span>
          {isAiring && (
            <span className="max-w-full rounded bg-primary px-2 py-1 text-[10px] font-bold leading-tight text-primary-foreground">
              {type === 'manga' ? 'Publicándose' : 'En emisión'}
            </span>
          )}
        </div>
        
        <div className="absolute top-2 right-2 flex flex-col gap-2 transition-transform duration-300 z-10">
          <button type="button"
            aria-label={`Agregar ${title} a una lista`}
            onClick={(e) => {
              e.preventDefault();
              onAddClick?.({ id, title, title_english, title_romaji, image, score, studio, year, isAiring, synopsis, season, genres, tags, format, status, episodes, totalUnits: totalUnits ?? episodes, type });
            }}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button type="button"
            aria-label={optimisticFavorite ? `Quitar ${title} de favoritos` : `Agregar ${title} a favoritos`}
            aria-pressed={optimisticFavorite}
            onClick={handleFavoriteClick}
            disabled={isPending}
            className={`w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-all group/fav cursor-pointer ${
              optimisticFavorite 
                ? 'bg-red-500/20 border border-red-500/30 text-red-500 shadow-md shadow-red-500/10' 
                : 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/5'
            }`}
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
      
      <div className="space-y-2">
        <Link href={`/${type}/${slug}`} className="block">
          <h3 className="font-bold text-sm leading-tight line-clamp-1 text-foreground hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {studio}{year > 0 ? ` • ${year}` : ''}
          </p>
        </Link>
        {personalStatus && (
          <span aria-label={`Mi estado: ${type === 'manga' ? personalStatus.manga : personalStatus.label}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-current/30 bg-background px-2 py-1 text-[11px] font-semibold leading-tight"
            style={{ color: statusColors[personalStatus.value] }}>
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
            {type === 'manga' ? personalStatus.manga : personalStatus.label}
          </span>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

