
import React from 'react';
import { getAnimeById, getAnimeCharacters, getAnimeEpisodes, getAnimeRecommendations } from '@/lib/jikan-service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { getAnimeListAssociations, getAnimeProgress } from '@/lib/actions/lists';
import AnimeActions from '@/components/anime/AnimeActions';
import BackButton from '@/components/navigation/BackButton';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return { title: "Anime Not Found" };
  
  const animeId = parseInt(idMatch[1]);
  try {
    const anime = await getAnimeById(animeId);
    return {
      title: anime.title_english || anime.title,
      description: anime.synopsis?.slice(0, 160) || `Experience ${anime.title} on AniTrack.`,
      openGraph: {
        images: [anime.images.webp.large_image_url || anime.images.jpg.large_image_url],
      },
    };
  } catch {
    return { title: "Anime | AniTrack" };
  }
}

export default async function AnimeDetailPage({ params }: Props) {
  const { slug } = await params;
  
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return notFound();
  
  const animeId = parseInt(idMatch[1]);

  let animeData;
  try {
    const [anime, characters, episodes, recommendations] = await Promise.all([
      getAnimeById(animeId),
      getAnimeCharacters(animeId),
      getAnimeEpisodes(animeId),
      getAnimeRecommendations(animeId)
    ]);
    animeData = { anime, characters, episodes, recommendations };
  } catch (error) {
    console.error('Error fetching anime data:', error);
    return notFound();
  }

  const { anime, characters, episodes, recommendations } = animeData;
  const mainCharacters = characters.filter(c => c.role === "Main").slice(0, 6);
  const recentEpisodes = episodes.slice(0, 3);
  const topRecommendations = recommendations.slice(0, 5);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isFavorite = false;
  let initialListIds: string[] = [];
  let progress = null;

  if (user) {
    // Check standard favorites
    const { data: favSimple } = await supabase
      .from('favorites')
      .select('id, media!inner(mal_id)')
      .eq('user_id', user.id)
      .eq('media.mal_id', animeId)
      .single();

    if (favSimple) {
      isFavorite = true;
    } else {
      // Check hentai vault
      const { data: hentaiFav } = await supabase
        .from('hentai')
        .select('id')
        .eq('user_id', user.id)
        .eq('mal_id', animeId)
        .single();
      
      isFavorite = !!hentaiFav;
    }

    initialListIds = await getAnimeListAssociations(animeId);
    progress = await getAnimeProgress(animeId);
  }

  const animeCardData = {
    id: animeId,
    title: anime.title_english || anime.title,
    image: anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
    score: anime.score || 0,
    studio: anime.studios.length > 0 ? anime.studios[0].name : 'Unknown',
    year: anime.year || undefined,
    synopsis: anime.synopsis,
    season: anime.season,
    tags: anime.genres.map(g => g.name)
  };

  return (
    <div className="flex-1 min-h-screen relative px-4 sm:px-8 lg:px-12 pb-20">
      <div className="absolute top-0 left-0 w-full h-[600px] z-0 opacity-20 pointer-events-none overflow-hidden">
        <div 
          className="w-full h-full bg-cover bg-center blur-3xl scale-110" 
          style={{ backgroundImage: `url('${anime.images.webp.large_image_url || anime.images.jpg.large_image_url}')` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background-dark via-background-dark/80 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto mt-24 lg:mt-32">
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted mb-8 px-4">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label="Anime" fallback="/anime" className="hover:text-primary transition-colors" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary truncate">{anime.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-end mb-12 px-4">
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="rounded-2xl overflow-hidden cinematic-shadow border border-white/10 group">
              <img 
                className="w-full aspect-2/3 object-cover transition-transform duration-500 group-hover:scale-105" 
                src={anime.images.webp.large_image_url || anime.images.jpg.large_image_url} 
                alt={anime.title}
              />
            </div>
          </div>

          <div className="flex-1 pb-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {anime.rank && (
                <span className="px-2 py-1 rounded bg-primary text-white text-[10px] font-bold tracking-wider uppercase">
                  Trending #{anime.rank}
                </span>
              )}
              <span className="px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase">
                {anime.type}
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-text-primary mb-6 leading-none">
              {anime.title_english || anime.title}
            </h1>

            <div className="flex flex-wrap gap-8 mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-2xl font-bold text-text-primary">{anime.score || 'N/A'}</span>
                <span className="text-xs text-text-muted mt-1">MAL Score</span>
              </div>
              <div className="h-8 w-px bg-white/10 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary">{anime.episodes || '?'}</span>
                <span className="text-xs text-text-muted">Episodes</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary">{anime.status || 'N/A'}</span>
                <span className="text-xs text-text-muted">Status</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary truncate max-w-[150px]">
                  {anime.studios.length > 0 ? anime.studios[0].name : 'Unknown'}
                </span>
                <span className="text-xs text-text-muted">Studio</span>
              </div>
            </div>

            <AnimeActions 
              animeData={animeCardData}
              isFavorite={isFavorite}
              initialListIds={initialListIds}
              initialProgress={progress}
              maxEpisodes={anime.episodes || undefined}
              userId={user?.id}
            />
          </div>
        </div>

        <div className="px-4">
          {/* Synopsis & Stats Full Width */}
          <div className="glass-panel rounded-3xl p-8 lg:p-10 mb-16 cinematic-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-1 bg-primary rounded-full"></div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-primary">Synopsis</h2>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-6">
                  {anime.synopsis || "No synopsis available."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {anime.genres.map(genre => (
                    <span key={genre.mal_id} className="px-4 py-1.5 rounded-full bg-slate-800 text-sm font-medium border border-white/5">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="lg:border-l lg:border-white/10 lg:pl-12 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Progress</span>
                  <span className="text-xs font-black text-primary">42%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-8">
                  <div className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(141,49,227,0.5)]" style={{ width: '42%' }}></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Score</span>
                    <span className="text-sm font-bold text-text-primary">{anime.score || 'N/A'} ({anime.scored_by?.toLocaleString() || '0'} votes)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Rank</span>
                    <span className="text-sm font-bold text-text-primary">#{anime.rank || 'N/A'} Overall</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Popularity</span>
                    <span className="text-sm font-bold text-text-primary">#{anime.popularity || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {mainCharacters.length > 0 && (
            <section className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-text-primary">Main Characters</h2>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-text-muted">{characters.length} TOTAL</span>
                </div>
  
              <Link href={`/anime/${slug}/characters`} className="text-primary text-sm font-medium hover:underline flex items-center gap-1 cursor-pointer">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {mainCharacters.map(char => (
                  <div key={char.character.mal_id} className="rounded-2xl p-3 flex flex-col items-center text-center transition-transform hover:scale-105">
                    <div className="size-24 rounded-full overflow-hidden mb-3 border-2 border-primary/20 shadow-lg">
                      <img 
                        className="w-full h-full object-cover" 
                        src={char.character.images.webp?.image_url || char.character.images.jpg.image_url} 
                        alt={char.character.name}
                      />
                    </div>
                    <p className="text-sm font-bold text-text-primary truncate w-full">{char.character.name}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-tighter">{char.role}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recentEpisodes.length > 0 && (
            <section className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-text-primary">Episodes</h2>
              </div>
              <div className="flex flex-col gap-3">
                {recentEpisodes.map(ep => (
                  <div key={ep.mal_id} className="p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-all group cursor-pointer glass-card border border-transparent hover:border-white/5">
                    <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" src={anime.images.webp.large_image_url} alt={ep.title} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-text-primary">{ep.title}</h4>
                      <p className="text-xs text-text-muted">{ep.aired ? new Date(ep.aired).toLocaleDateString() : 'Unknown date'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {ep.filler && <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold rounded uppercase">Filler</span>}
                      <span className="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">play_circle</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {topRecommendations.length > 0 && (
            <section className="mt-20 pb-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-text-primary">More Like This</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {topRecommendations.map(rec => (
                   <Link 
                    key={rec.entry.mal_id} 
                    href={`/anime/${rec.entry.mal_id}-${slugify(rec.entry.title)}`}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-2/3 rounded-2xl overflow-hidden mb-3 shadow-lg group-hover:shadow-primary/20 transition-all border border-white/5">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        src={rec.entry.images.webp.image_url} 
                        alt={rec.entry.title}
                      />
                    </div>
                    <p className="font-bold text-sm truncate text-text-primary">{rec.entry.title}</p>
                    <p className="text-xs text-text-muted">Recommendation</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
