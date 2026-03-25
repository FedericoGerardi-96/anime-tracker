
import React from 'react';
import Link from 'next/link';
import { getAnimeById, getAnimeCharacters } from '@/lib/jikan-service';
import CharactersClient from '@/components/anime/CharactersClient';
import BackButton from '@/components/navigation/BackButton';

interface CharactersPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CharactersPage({ params }: CharactersPageProps) {
  const { slug } = await params;
  const animeId = parseInt(slug.split('-')[0]);

  if (isNaN(animeId)) {
    return <div className="p-12 text-center">Invalid Anime ID</div>;
  }

  const [anime, characters] = await Promise.all([
    getAnimeById(animeId),
    getAnimeCharacters(animeId)
  ]);

  return (
    <main className="min-h-screen pt-24 lg:pt-28 pb-12">
      <div className="max-w-[1600px] mx-auto p-6 md:p-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link className="hover:text-primary transition-colors" href="/">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label="Anime" fallback="/anime" className="hover:text-primary transition-colors" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link className="hover:text-primary transition-colors max-w-[200px] truncate" href={`/anime/${slug}`}>
            {anime.title_english || anime.title}
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-white">Characters</span>
        </nav>

        {/* Title Section */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-4 text-white">
            Characters — <span className="text-primary">{anime.title_english || anime.title}</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">Detailed cast list and voice actor information sourced from the seasonal archive.</p>
        </header>

        {/* Split View Components */}
        <CharactersClient 
          initialCharacters={characters} 
          animeTitle={anime.title_english || anime.title} 
        />
      </div>
    </main>
  );
}
