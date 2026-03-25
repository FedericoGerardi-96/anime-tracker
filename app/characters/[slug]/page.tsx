
import React from 'react';
import { getCharacterFullById } from '@/lib/jikan-service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/navigation/BackButton';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GlobalCharacterDetailPage({ params }: Props) {
  const { slug } = await params;
  const idMatch = slug.match(/^(\d+)/);
  if (!idMatch) return notFound();
  const charId = parseInt(idMatch[1]);

  let char;
  try {
    char = await getCharacterFullById(charId);
  } catch (error) {
    console.error('Error fetching global character details:', error);
    return notFound();
  }

  return (
    <main className="min-h-screen pt-24 lg:pt-28 pb-12 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -mr-64 -mt-64 z-0 pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto p-6 md:p-10 relative z-10">
        <nav className="flex items-center gap-2 mb-12 text-xs font-bold uppercase tracking-widest text-slate-500">
          <Link className="hover:text-primary transition-colors" href="/">Home</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <BackButton label="Profiles" fallback="/characters" className="hover:text-primary transition-colors" />
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-white truncate">{char.name}</span>
        </nav>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
          {/* Visual Profile (4 cols) */}
          <div className="xl:col-span-4 lg:sticky lg:top-28">
            <div className="glass-panel p-6 rounded-[2.5rem] shadow-2xl relative group">
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden border-2 border-primary/20 shadow-xl relative">
                <img 
                  src={char.images.webp?.image_url || char.images.jpg.image_url} 
                  alt={char.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                <div className="absolute bottom-6 left-6 right-6">
                    <h2 className="text-3xl font-black text-white leading-none mb-1">{char.name}</h2>
                    <p className="text-primary text-xs font-bold uppercase tracking-widest">{char.name_kanji}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8 px-2">
                  <div className="bg-slate-950/40 p-4 rounded-3xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">Favorites</span>
                    <span className="text-xl font-black text-white">{char.favorites?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-3xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">MAL Rank</span>
                    <span className="text-xl font-black text-white">#0</span> {/* Rank is not returned by character/full? */}
                  </div>
              </div>

              <div className="mt-8 px-2 space-y-4">
                <a 
                  href={char.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group transition-all hover:shadow-[0_0_20px_rgba(141,49,227,0.4)]"
                >
                  <span>Mylife on MAL</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          {/* Biographical Detail (8 cols) */}
          <div className="xl:col-span-8 space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-1 bg-primary rounded-full"></div>
                 <h2 className="text-lg font-black uppercase tracking-widest text-primary">Biography & Data</h2>
              </div>
              <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                
                <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-line custom-scrollbar max-h-[1000px] overflow-y-auto pr-4">
                  {char.about || "Profile information is currently being archived."}
                </p>
              </div>
            </section>

            {/* Related Anime / Manga */}
            {(char.anime?.length > 0 || char.manga?.length > 0) && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-1 bg-primary rounded-full"></div>
                  <h2 className="text-lg font-black uppercase tracking-widest text-primary">Appearances</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {char.anime?.slice(0, 4).map((entry: any) => (
                    <Link 
                      key={entry.anime.mal_id}
                      href={`/anime/${entry.anime.mal_id}-${slugify(entry.anime.title)}`}
                      className="group relative"
                    >
                      <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 relative">
                        <img 
                          src={entry.anime.images.webp?.large_image_url || entry.anime.images.jpg.large_image_url} 
                          alt={entry.anime.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                             <p className="text-[10px] font-black text-primary uppercase mb-1">{entry.role}</p>
                             <p className="text-xs font-bold text-white truncate">{entry.anime.title}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Voice Actors Section */}
            {char.voices?.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-1 bg-primary rounded-full"></div>
                  <h2 className="text-lg font-black uppercase tracking-widest text-primary">Voices of Character</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {char.voices.map((v: any) => (
                     <div key={v.person.mal_id} className="bg-slate-900/40 p-4 rounded-3xl border border-white/5 flex items-center gap-4 group hover:ring-2 hover:ring-primary/40 transition-all">
                        <div className="w-14 h-14 rounded-full overflow-hidden border border-primary/40 shrink-0">
                           <img src={v.person.images.jpg.image_url} alt={v.person.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-xs font-black uppercase text-slate-500">{v.language}</p>
                           <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{v.person.name}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
