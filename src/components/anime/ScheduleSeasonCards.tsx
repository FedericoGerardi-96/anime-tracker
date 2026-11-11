'use client';

import { useState } from 'react';
import AnimeCard, { type AnimeCardProps } from '@/components/cards/AnimeCard';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { requestListDialog } from '@/lib/list-dialog-request';
import type { ListDialogResult } from '@/interfaces/list-dialog';
import type { CatalogAnime } from '@/interfaces/media-catalog';

interface SeasonCardsProps {
  seasonAnime: CatalogAnime[];
  favoriteMalIds: number[];
  userId?: string;
}
export default function SeasonCards({ seasonAnime, favoriteMalIds, userId }: SeasonCardsProps) {
  // List actions remain available from the season catalog.

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeCardProps | null>(null);
  const [dataPromise, setDataPromise] = useState<Promise<ListDialogResult> | null>(null);

  const handleAddClick = (anime: AnimeCardProps) => {
    if (!userId) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedAnime(anime);
    setDataPromise(requestListDialog(Number(anime.id), 'anime'));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {seasonAnime.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <span className="material-symbols-outlined mb-4 animate-pulse text-5xl text-muted-foreground">
            calendar_today
          </span>
          <h3 className="text-lg font-bold text-foreground">Sin títulos en esta temporada</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Probá otra temporada o cambiá el filtro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {seasonAnime.map((anime) => {
            const mappedCard = {
              id: anime.mal_id,
              title: anime.title_english || anime.title,
              title_english: anime.title_english,
              title_romaji: anime.title_romaji ?? anime.title,
              image: anime.images.webp.large_image_url,
              score: anime.score ?? 0,
              studio: anime.studios[0]?.name || 'Estudio desconocido',
              year: anime.year ?? 0,
              isAiring: anime.airing,
              synopsis: anime.synopsis ?? undefined,
              season: anime.season ?? undefined,
              genres: anime.genres.map((genre) => genre.name),
              tags: anime.tags ?? [],
              format: anime.type,
              status: anime.status,
              totalUnits: anime.episodes ?? undefined,
              episodes: anime.episodes ?? undefined,
              type: 'anime' as const,
            };
            return (
              <AnimeCard
                key={anime.mal_id}
                {...mappedCard}
                isFavorite={favoriteMalIds?.includes(anime.mal_id) ?? false}
                userId={userId}
                onAddClick={handleAddClick}
              />
            );
          })}
        </div>
      )}

      {/* Authentication and List Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <AddToListModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAnime(null);
          setDataPromise(null);
        }}
        mode="add-anime"
        animeData={
          selectedAnime
            ? {
                mal_id: Number(selectedAnime.id),
                title: selectedAnime.title,
                title_english: selectedAnime.title_english,
                title_romaji: selectedAnime.title_romaji,
                image: selectedAnime.image,
                type: selectedAnime.type || 'anime',
                synopsis: selectedAnime.synopsis,
                season: selectedAnime.season,
                tags: selectedAnime.tags,
                episodes: selectedAnime.episodes,
                score: selectedAnime.score,
              }
            : undefined
        }
        dataPromise={dataPromise}
      />
    </div>
  );
}
