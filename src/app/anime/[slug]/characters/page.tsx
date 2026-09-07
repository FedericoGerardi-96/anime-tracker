
import Link from 'next/link';

import { getMalAnimeById } from '@/lib/myanimelist-service';
import { CharacterProviderUnavailableError, getAnimeCharacters } from '@/services/anilist-characters';
import CharactersClient from '@/components/anime/CharactersClient';
import BackButton from '@/components/navigation/BackButton';
import { getAuthenticatedUser } from '@/services/supabase';

interface CharactersPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CharactersPage({ params }: Readonly<CharactersPageProps>) {
  const { slug } = await params;
  const animeId = Number.parseInt(slug.split('-')[0]);

  if (Number.isNaN(animeId)) {
    return <div className="p-12 text-center">Invalid Anime ID</div>;
  }

  const [anime, user] = await Promise.all([getMalAnimeById(animeId), getAuthenticatedUser()]);
  let characters;
  try {
    characters = await getAnimeCharacters(animeId);
  } catch (error) {
    if (!(error instanceof CharacterProviderUnavailableError)) throw error;
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <span className="material-symbols-outlined mb-4 text-5xl text-amber-500">cloud_off</span>
        <h1 className="text-2xl font-black">No pudimos cargar los personajes</h1>
        <p className="mt-2 text-muted-foreground">AniList no está disponible y el reparto de este anime todavía no fue guardado en AniTrack. Probá nuevamente más tarde.</p>
        <Link href={`/anime/${slug}`} className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Volver al anime</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-6">
      <div className="max-w-[1600px] mx-auto p-6 md:p-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <Link className="hover:text-primary transition-colors" href="/">Inicio</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label="Anime" fallback="/anime" className="hover:text-primary transition-colors" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link className="hover:text-primary transition-colors max-w-[200px] truncate" href={`/anime/${slug}`}>
            {anime.title_english || anime.title}
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-foreground">Personajes</span>
        </nav>

        {/* Title Section */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-4 text-white">
            Personajes — <span className="text-primary">{anime.title_english || anime.title}</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">Reparto, perfiles y seiyūs proporcionados por AniList y guardados en AniTrack.</p>
        </header>

        {/* Split View Components */}
        <CharactersClient 
          initialCharacters={characters} 
          animeTitle={anime.title_english || anime.title} 
          canSaveTranslations={Boolean(user)}
        />
      </div>
    </main>
  );
}
