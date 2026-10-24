
'use client'
import { useState } from 'react';

import AnimeCard from '@/components/cards/AnimeCard';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { requestListDialog } from '@/lib/list-dialog-request';
import type { ListDialogResult } from '@/interfaces/list-dialog';

interface AnimeListContentProps {
  animeList: any[];
  userId?: string;
}

export default function AnimeListContent({ animeList, userId }: Readonly<AnimeListContentProps>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<any>(null);
  const [dataPromise, setDataPromise] = useState<Promise<ListDialogResult> | null>(null);

  const handleAddClick = (anime: any) => {
    if (!userId) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedAnime(anime);
    setDataPromise(requestListDialog(Number(anime.id), anime.type === 'manga' ? 'manga' : 'anime'));
    setIsModalOpen(true);
  };

  return (
    <>
      <h2 className="sr-only">Resultados del catálogo</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {animeList.map((anime, index) => (
          <AnimeCard 
            key={anime.id} 
            {...anime} 
            priorityImage={index < 2}
            userId={userId}
            onAddClick={handleAddClick}
          />
        ))}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AddToListModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAnime(null);
          setDataPromise(null);
        }}
        mode="add-anime"
        animeData={selectedAnime ? {
          mal_id: Number(selectedAnime.id),
          title: selectedAnime.title,
          image: selectedAnime.image,
          type: selectedAnime.type || 'anime',
          synopsis: selectedAnime.synopsis,
          season: selectedAnime.season,
          year: selectedAnime.year,
          genres: selectedAnime.genres,
          tags: selectedAnime.tags,
          format: selectedAnime.format,
          status: selectedAnime.status,
          totalUnits: selectedAnime.totalUnits ?? selectedAnime.episodes,
          episodes: selectedAnime.episodes,
          score: selectedAnime.score
        } : undefined}
        dataPromise={dataPromise}
      />
    </>
  );
}
