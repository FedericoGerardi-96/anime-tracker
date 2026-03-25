
'use client';

import React, { useState, useEffect } from 'react';
import { JikanCharacter } from '@/types/jikan';
import { getCharacterFullById } from '@/lib/jikan-service';

interface CharactersClientProps {
  initialCharacters: JikanCharacter[];
  animeTitle: string;
}

export default function CharactersClient({ initialCharacters, animeTitle }: CharactersClientProps) {
  const [selectedChar, setSelectedChar] = useState<JikanCharacter | null>(initialCharacters[0] || null);
  const [fullCharData, setFullCharData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedChar) {
      const fetchFullData = async () => {
        setIsLoading(true);
        try {
          const data = await getCharacterFullById(selectedChar.character.mal_id);
          setFullCharData(data);
        } catch (error) {
          console.error("Error fetching character details:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFullData();
    }
  }, [selectedChar]);

  const jpVoiceActor = selectedChar?.voice_actors?.find(va => va.language === 'Japanese');

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Character Grid (8 Cols) */}
      <div className="xl:col-span-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {initialCharacters.map((char) => {
            const isActive = selectedChar?.character.mal_id === char.character.mal_id;
            return (
              <div 
                key={char.character.mal_id}
                onClick={() => setSelectedChar(char)}
                className={`group relative bg-slate-900/40 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                  isActive ? 'border-primary shadow-2xl shadow-primary/20' : 'border-white/5 hover:border-primary/50'
                }`}
              >
                <div className="aspect-[3/4] relative">
                  <img 
                    className={`w-full h-full object-cover transition-all duration-500 ${!isActive ? 'grayscale group-hover:grayscale-0' : ''}`} 
                    src={char.character.images.webp?.image_url || char.character.images.jpg.image_url} 
                    alt={char.character.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full w-fit mb-1 ${
                    char.role === 'Main' ? 'bg-primary text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {char.role}
                  </div>
                  <h3 className="font-bold text-white text-sm md:text-base truncate">{char.character.name}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed View / Sidebar (4 Cols) */}
      <div className="xl:col-span-4">
        <div className="sticky top-28 space-y-6">
          <div className="glass-panel bg-slate-900/40 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group min-h-[500px]">
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-700"></div>
            
            {/* Selected Character Content */}
            {selectedChar && (
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 shrink-0">
                    <img 
                      className="w-full h-full object-cover" 
                      src={selectedChar.character.images.webp?.image_url || selectedChar.character.images.jpg.image_url} 
                      alt={selectedChar.character.name} 
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedChar.character.name}</h2>
                    <p className="text-primary text-xs font-bold uppercase tracking-[0.2em]">
                      {selectedChar.role} {fullCharData?.name_kanji ? `/ ${fullCharData.name_kanji}` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Bio / About */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Character Profile</h4>
                    {isLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-white/5 rounded w-full"></div>
                        <div className="h-4 bg-white/5 rounded w-5/6"></div>
                        <div className="h-4 bg-white/5 rounded w-4/6"></div>
                      </div>
                    ) : (
                      <p className="text-slate-300 text-sm leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {fullCharData?.about || "No profile information available."}
                      </p>
                    )}
                  </div>

                  {/* Voice Actor */}
                  {jpVoiceActor && (
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-white/5 transition-all hover:border-primary/30 group/va">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/30 shrink-0">
                        <img 
                          className="w-full h-full object-cover" 
                          src={jpVoiceActor.person.images.jpg.image_url} 
                          alt={jpVoiceActor.person.name} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Voice Actor (JP)</h4>
                        <p className="text-white font-bold text-sm truncate">{jpVoiceActor.person.name}</p>
                      </div>
                      <a 
                        href={jpVoiceActor.person.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="material-symbols-outlined text-slate-500 hover:text-white transition-colors"
                      >
                        open_in_new
                      </a>
                    </div>
                  )}

                  {/* Metadata List (Favorites) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Favorites</span>
                      <span className="text-white font-bold text-xs">{fullCharData?.favorites?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Manga Debut</span>
                      <span className="text-white font-bold text-xs truncate">Database Linked</span>
                    </div>
                  </div>

                  {/* Action */}
                  <a 
                    href={selectedChar.character.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>Full Character MAL</span>
                    <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Context Card */}
          <div className="bg-slate-900/40 rounded-3xl p-6 border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Quick Stats</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Cast</span>
                <span className="text-white font-bold">{initialCharacters.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Main Characters</span>
                <span className="text-primary font-bold">{initialCharacters.filter(c => c.role === 'Main').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
