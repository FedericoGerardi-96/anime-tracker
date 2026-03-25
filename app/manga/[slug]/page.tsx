
import React from 'react';
import { getMangaById, getMangaCharacters, getMangaRecommendations } from '@/lib/jikan-service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { getMediaListAssociations, getMediaProgress } from '@/lib/actions/lists';
import AnimeActions from '@/components/anime/AnimeActions';
import BackButton from '@/components/navigation/BackButton';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return { title: "Manga Not Found" };
  
  const mangaId = parseInt(idMatch[1]);
  try {
    const manga = await getMangaById(mangaId);
    return {
      title: manga.title_english || manga.title,
      description: manga.synopsis?.slice(0, 160) || `Experience ${manga.title} on AniTrack.`,
      openGraph: {
        images: [manga.images.webp.large_image_url || manga.images.jpg.large_image_url],
      },
    };
  } catch {
    return { title: "Manga | AniTrack" };
  }
}

export default async function MangaDetailPage({ params }: Props) {
  const { slug } = await params;
  
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return notFound();
  
  const mangaId = parseInt(idMatch[1]);

  let mangaData;
  try {
    const [manga, characters, recommendations] = await Promise.all([
      getMangaById(mangaId),
      getMangaCharacters(mangaId),
      getMangaRecommendations(mangaId)
    ]);
    mangaData = { manga, characters, recommendations };
  } catch (error) {
    console.error('Error fetching manga data:', error);
    return notFound();
  }

  const { manga, characters, recommendations } = mangaData;
  const mainCharacters = characters.slice(0, 6); // Manga characters don't always have roles in the basic response
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
      .select('id, media!inner(mal_id, type)')
      .eq('user_id', user.id)
      .eq('media.mal_id', mangaId)
      .eq('media.type', 'manga')
      .single();

    if (favSimple) {
      isFavorite = true;
    } else {
      // Check hentai vault
      const { data: hentaiFav } = await supabase
        .from('hentai')
        .select('id')
        .eq('user_id', user.id)
        .eq('mal_id', mangaId)
        .single();
      
      isFavorite = !!hentaiFav;
    }

    initialListIds = await getMediaListAssociations(mangaId);
    progress = await getMediaProgress(mangaId);
  }

  const mangaCardData = {
    id: mangaId,
    title: manga.title_english || manga.title,
    image: manga.images.webp.large_image_url || manga.images.jpg.large_image_url,
    type: 'manga',
    score: manga.score || 0,
    studio: manga.authors.length > 0 ? manga.authors[0].name : 'Unknown',
    synopsis: manga.synopsis,
    season: manga.type,
    tags: manga.genres.map(g => g.name)
  };

  return (
    <div className="flex-1 min-h-screen relative px-4 sm:px-8 lg:px-12 pb-20 pt-24 lg:pt-28">
      {/* Background Blur */}
      <div className="absolute top-0 left-0 w-full h-[600px] z-0 opacity-20 pointer-events-none overflow-hidden">
        <div 
          className="w-full h-full bg-cover bg-center blur-3xl scale-110" 
          style={{ backgroundImage: `url('${manga.images.webp.large_image_url || manga.images.jpg.large_image_url}')` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-background-dark via-background-dark/80 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted mb-8 px-4">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label="Manga" fallback="/manga" className="hover:text-primary transition-colors" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary truncate">{manga.title}</span>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-end mb-12 px-4">
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="rounded-2xl overflow-hidden cinematic-shadow border border-white/10 group">
              <img 
                className="w-full aspect-2/3 object-cover transition-transform duration-500 group-hover:scale-105" 
                src={manga.images.webp.large_image_url || manga.images.jpg.large_image_url} 
                alt={manga.title}
              />
            </div>
          </div>

          <div className="flex-1 pb-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {manga.rank && (
                <span className="px-2 py-1 rounded bg-primary text-white text-[10px] font-bold tracking-wider uppercase">
                  Rank #{manga.rank}
                </span>
              )}
              <span className="px-2 py-1 rounded bg-slate-800 text-white text-[10px] font-bold tracking-wider uppercase">
                {manga.type}
              </span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-text-primary mb-6 leading-none">
              {manga.title_english || manga.title}
            </h1>

            <div className="flex flex-wrap gap-8 mb-8">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-2xl font-bold text-text-primary">{manga.score || 'N/A'}</span>
                <span className="text-xs text-text-muted mt-1">MAL Score</span>
              </div>
              <div className="h-8 w-px bg-white/10 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary">{manga.chapters || '?'}</span>
                <span className="text-xs text-text-muted">Chapters</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary">{manga.status || 'N/A'}</span>
                <span className="text-xs text-text-muted">Status</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary truncate max-w-[150px]">
                  {manga.authors.length > 0 ? manga.authors[0].name : 'Unknown'}
                </span>
                <span className="text-xs text-text-muted">Author</span>
              </div>
            </div>

            <AnimeActions 
              animeData={mangaCardData}
              isFavorite={isFavorite}
              initialListIds={initialListIds}
              initialProgress={progress}
              maxEpisodes={manga.chapters || undefined}
              userId={user?.id}
            />
          </div>
        </div>

        {/* Content Tabs / Info */}
        <div className="px-4">
          <div className="glass-panel rounded-3xl p-8 lg:p-10 mb-16 cinematic-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-1 bg-primary rounded-full"></div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-primary">Synopsis</h2>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-6">
                  {manga.synopsis || "No synopsis available."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {manga.genres.map(genre => (
                    <span key={genre.mal_id} className="px-4 py-1.5 rounded-full bg-slate-800 text-sm font-medium border border-white/5">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="lg:border-l lg:border-white/10 lg:pl-12 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Volumes</span>
                    <span className="text-sm font-bold text-text-primary">{manga.volumes || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">MAL Rank</span>
                    <span className="text-sm font-bold text-text-primary">#{manga.rank || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-slate-400">Popularity</span>
                    <span className="text-sm font-bold text-text-primary">#{manga.popularity || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations / Related */}
          {topRecommendations.length > 0 && (
            <section className="mt-20 pb-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-text-primary">Recommended Reads</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {topRecommendations.map(rec => (
                   <Link 
                    key={rec.entry.mal_id} 
                    href={`/manga/${rec.entry.mal_id}-${slugify(rec.entry.title)}`}
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
