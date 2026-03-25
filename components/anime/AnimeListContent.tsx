
'use client'

import React, { useState } from 'react';
import AnimeCard from '@/components/cards/AnimeCard';
import AddToListModal from '@/components/ui/AddToListModal';
import AuthModal from '@/components/auth/AuthModal';
import { getAnimeListAssociations } from '@/lib/actions/lists';

interface AnimeListContentProps {
  animeList: any[];
  userId?: string;
}

export default function AnimeListContent({ animeList, userId }: AnimeListContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<any>(null);
  const [initialListIds, setInitialListIds] = useState<string[]>([]);
  const [isLoadingAssociations, setIsLoadingAssociations] = useState(false);

  const handleAddClick = async (anime: any) => {
    if (!userId) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedAnime(anime);
    setIsModalOpen(true);
    setIsLoadingAssociations(true);
    
    // Fetch current associations for this anime
    // This helps the user see where it's already added
    const associations = await getAnimeListAssociations(Number(anime.id));
    setInitialListIds(associations);
    setIsLoadingAssociations(false);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {animeList.map((anime) => (
          <AnimeCard 
            key={anime.id} 
            {...anime} 
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
          setInitialListIds([]);
        }}
        mode="add-anime"
        animeData={selectedAnime ? {
          mal_id: Number(selectedAnime.id),
          title: selectedAnime.title,
          image: selectedAnime.image,
          type: selectedAnime.type || 'anime',
          synopsis: selectedAnime.synopsis,
          season: selectedAnime.season,
          tags: selectedAnime.tags,
          episodes: selectedAnime.episodes
        } : undefined}
        initialListIds={initialListIds}
      />
    </>
  );
}
