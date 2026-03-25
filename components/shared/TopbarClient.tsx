'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { logout } from '@/lib/actions/auth';
import type { User } from '@supabase/supabase-js';
import { getAnimeList, getMangaList, getCharacterList } from '@/lib/jikan-service';
import { slugify } from '@/lib/utils';
import Dropdown from '@/components/dropdown/dropdown';
import AuthModal from '@/components/auth/AuthModal';
import { IProfile } from '@/types/profile';

type SearchType = 'anime' | 'manga' | 'character';

export default function TopbarClient({ user, profile }: { user?: User | null, profile?: IProfile | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>('anime');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 3) {
        setIsSearching(true);
        try {
          let results = [];
          if (searchType === 'anime') {
            const { data } = await getAnimeList({ q: query, page: 1 });
            results = data;
          } else if (searchType === 'manga') {
            const { data } = await getMangaList({ q: query, page: 1 });
            results = data;
          } else if (searchType === 'character') {
            const { data } = await getCharacterList(query);
            results = data;
          }
          setSuggestions(results.slice(0, 5));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  const handleSearchCommit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    setShowSuggestions(false);
    const params = new URLSearchParams();
    params.set('q', query.trim());
    
    if (searchType === 'anime') router.push(`/anime?${params.toString()}`);
    else if (searchType === 'manga') router.push(`/manga?${params.toString()}`);
    else if (searchType === 'character') router.push(`/characters?${params.toString()}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuggestionClick = (item: any) => {
    setShowSuggestions(false);
    setQuery('');
    
    if (searchType === 'character') {
      router.push(`/characters/${item.mal_id}-${slugify(item.name)}`);
    } else {
      const type = searchType === 'anime' ? 'anime' : 'manga';
      const slug = `${item.mal_id}-${slugify(item.title_english || item.title)}`;
      router.push(`/${type}/${slug}`);
    }
  };

  return (
    <header className="flex items-center justify-between px-8 absolute top-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-100 h-20">
      <div className="flex-1 max-w-xl relative  flex items-center gap-3" ref={searchContainerRef}>
        
        {/* Type Selector Using Global Dropdown Component */}
        <div className="shrink-0 relative z-120 mr-6">
          <Dropdown
            value={searchType}
            onChange={(val) => {
              setSearchType(val as SearchType);
              setShowSuggestions(false);
            }}
            options={[
              { label: 'Anime', value: 'anime', icon: <span className="material-symbols-outlined text-sm">movie</span> },
              { label: 'Manga', value: 'manga', icon: <span className="material-symbols-outlined text-sm">menu_book</span> },
              { label: 'Char', value: 'character', icon: <span className="material-symbols-outlined text-sm">person</span> }
            ]}
            className="w-32!"
            buttonClassName="!bg-slate-100 dark:!bg-slate-800/80 !border-slate-200 dark:!border-white/5 !rounded-full py-2.5"
            menuClassName="!bg-white dark:!bg-slate-950 !border-slate-200 dark:!border-white/10 !shadow-2xl !w-40"
          />
        </div>

        <form onSubmit={handleSearchCommit} className="relative z-10 group flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
            {isSearching ? 'sync' : 'search'}
          </span>
          <input 
            name="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 3 && setShowSuggestions(true)}
            autoComplete="off"
            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none text-slate-900 dark:text-white" 
            placeholder={`Search ${searchType}...`} 
            type="text"
          />
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 py-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {suggestions.map((item: any) => {
              const name = searchType === 'character' ? item.name : (item.title_english || item.title);
              const sub = searchType === 'character' ? item.name_kanji : `${item.type} • ${item.status}`;
              const img = item.images?.webp?.small_image_url || item.images?.jpg?.small_image_url;
              
              return (
                <button
                  key={item.mal_id}
                  onClick={() => handleSuggestionClick(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-10 h-14 relative rounded-md overflow-hidden shrink-0 border border-white/10">
                    <Image src={img} alt={name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">
                      {name}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-tight">
                      {sub}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-text-muted text-sm px-2 opacity-0 group-hover:opacity-100">
                    chevron_right
                  </span>
                </button>
              );
            })}
            <button 
              onClick={() => handleSearchCommit()}
              className="w-full py-3 text-center text-xs font-bold text-primary hover:bg-white/5 transition-colors border-t border-white/5 mt-2"
            >
              See all results for &quot;{query}&quot;
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <button className="text-slate-500 hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="relative group shrink-0">
              <Link href="/profile" className="block w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/10 hover:ring-primary/30 transition-all shadow-sm cursor-pointer">
                <div 
                  className="w-full h-full bg-cover bg-center" 
                  style={{ backgroundImage: `url('${profile?.avatar || user?.user_metadata?.avatar_url || 'https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png'}')` }}
                />
              </Link>
              <div className="absolute top-12 right-0 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                <form action={logout}>
                  <button type="submit" className="text-sm font-bold text-red-400 hover:text-red-300 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 w-full transition-colors cursor-pointer text-left">
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all shadow-lg hover:shadow-primary/30 cursor-pointer"
          >
            Login
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
}
