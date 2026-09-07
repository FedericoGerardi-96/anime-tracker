'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import AuthModal from '@/components/auth/AuthModal';
import Dropdown from '@/components/dropdown/dropdown';
import { logout } from '@/lib/actions/auth';
import { slugify } from '@/lib/utils';
import type { IProfile } from '@/types/profile';

type SearchType = 'anime' | 'manga' | 'character';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio' },
  { href: '/anime', label: 'Anime' },
  { href: '/manga', label: 'Manga' },
  { href: '/anime/schedule', label: 'Calendario' },
  { href: '/favorites', label: 'Favoritos', private: true },
  { href: '/lists', label: 'Mis listas', private: true },
  { href: '/hentai', label: 'Hentai', private: true, adult: true },
];

export default function TopbarClient({ user, profile }: Readonly<{ user?: User | null; profile?: IProfile | null }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>('anime');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchUnavailable, setSearchUnavailable] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('anitrack-theme');
    const shouldUseDark = savedTheme
      ? savedTheme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    document.documentElement.classList.toggle('dark', shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  useEffect(() => {
    const closeAccountMenu = (event: PointerEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeAccountMenu);
    return () => {
      document.removeEventListener('pointerdown', closeAccountMenu);
      if (accountCloseTimerRef.current) clearTimeout(accountCloseTimerRef.current);
    };
  }, []);

  const openAccountMenu = () => {
    if (accountCloseTimerRef.current) clearTimeout(accountCloseTimerRef.current);
    setIsAccountMenuOpen(true);
  };

  const scheduleAccountMenuClose = () => {
    if (accountCloseTimerRef.current) clearTimeout(accountCloseTimerRef.current);
    accountCloseTimerRef.current = setTimeout(() => setIsAccountMenuOpen(false), 220);
  };

  useEffect(() => {
    const closeSuggestions = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', closeSuggestions);
    return () => document.removeEventListener('mousedown', closeSuggestions);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      setSearchUnavailable(false);
      try {
        const response = await fetch(`/api/catalog/search?type=${searchType}&q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`La búsqueda respondió ${response.status}`);
        const results = await response.json() as { data: unknown[] };
        setSuggestions(results.data.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Search error:', error);
        setSuggestions([]);
        setSearchUnavailable(true);
        setShowSuggestions(true);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchType]);

  const handleSearchCommit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    const destination = searchType === 'character' ? '/characters' : `/${searchType}`;
    router.push(`${destination}?q=${encodeURIComponent(query.trim())}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuggestionClick = (item: any) => {
    setShowSuggestions(false);
    setQuery('');
    if (searchType === 'character') {
      router.push(`/characters/${item.mal_id}-${slugify(item.name)}`);
      return;
    }
    router.push(`/${searchType}/${item.mal_id}-${slugify(item.title_english || item.title)}`);
  };

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    (!item.private || Boolean(user))
    && (!item.adult || Boolean(user && profile?.show_h_content))
  );
  const activeNavHref = visibleNavItems
    .filter((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
  const isActive = (href: string) => href === activeNavHref;

  const toggleTheme = () => {
    const nextThemeIsDark = !isDark;
    document.documentElement.classList.toggle('dark', nextThemeIsDark);
    window.localStorage.setItem('anitrack-theme', nextThemeIsDark ? 'dark' : 'light');
    setIsDark(nextThemeIsDark);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setIsMenuOpen(false)}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie_filter</span>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">AniTrack</span>
              <span className="hidden text-[0.7rem] text-muted-foreground sm:block">Tu diario otaku</span>
            </span>
          </Link>

          <nav className="ml-3 hidden items-center gap-1 lg:flex">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div ref={searchContainerRef} className="relative hidden sm:block">
              <form onSubmit={handleSearchCommit} className="flex h-9 w-64 items-center rounded-full border border-border bg-muted/60 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 xl:w-80">
                <Dropdown
                  value={searchType}
                  onChange={(value) => setSearchType(value as SearchType)}
                  options={[
                    { value: 'anime', label: 'Anime' },
                    { value: 'manga', label: 'Manga' },
                    { value: 'character', label: 'Personaje' },
                  ]}
                  className="w-auto! shrink-0"
                  buttonClassName="h-8 border-0! bg-transparent! px-3! py-0! text-xs! text-muted-foreground! hover:text-foreground! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  menuClassName="min-w-36!"
                />
                <span className={`material-symbols-outlined ml-1 text-base text-muted-foreground ${isSearching ? 'animate-spin' : ''}`}>
                  {isSearching ? 'progress_activity' : 'search'}
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar..."
                  autoComplete="off"
                />
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-80 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-2xl">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {suggestions.map((item: any) => {
                    const name = searchType === 'character' ? item.name : item.title_english || item.title;
                    const image = item.images?.webp?.small_image_url || item.images?.jpg?.small_image_url;
                    return (
                      <button type="button" key={item.mal_id} onClick={() => handleSuggestionClick(item)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted">
                        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {image && <Image src={image} alt={name} fill sizes="36px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                        <span className="material-symbols-outlined text-base text-muted-foreground">chevron_right</span>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => handleSearchCommit()} className="mt-1 w-full border-t border-border py-2 text-xs font-semibold text-primary">
                    Ver todos los resultados
                  </button>
                </div>
              )}
              {showSuggestions && searchUnavailable && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-80 rounded-2xl border border-amber-500/25 bg-popover p-4 text-sm shadow-2xl">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-lg text-amber-500">cloud_off</span>
                    {searchType === 'character' ? 'AniList no está disponible' : 'Búsqueda temporalmente no disponible'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {searchType === 'character'
                      ? 'AniList deshabilitó temporalmente su API por problemas de estabilidad. Probá nuevamente más tarde.'
                      : 'MyAnimeList no está respondiendo. Probá nuevamente en unos minutos.'}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
              title={isDark ? 'Tema claro' : 'Tema oscuro'}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <span className="material-symbols-outlined text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>

            {user ? (
              <div
                ref={accountMenuRef}
                className="relative"
                onMouseEnter={openAccountMenu}
                onMouseLeave={scheduleAccountMenuClose}
              >
                <button
                  type="button"
                  aria-label="Abrir menú de cuenta"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="block size-9 overflow-hidden rounded-full ring-2 ring-primary/20 transition hover:ring-primary/50"
                >
                  <span className="block size-full bg-cover bg-center" style={{ backgroundImage: `url('${profile?.avatar || user.user_metadata?.avatar_url || 'https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png'}')` }} />
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-full w-40 pt-2" role="menu">
                    <div className="rounded-xl border border-border bg-popover p-1 shadow-xl">
                      <Link href="/profile" role="menuitem" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mi perfil</Link>
                      <form action={logout}>
                        <button type="submit" role="menuitem" className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-muted">Cerrar sesión</button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setIsAuthModalOpen(true)} className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:block">
                Iniciar sesión
              </button>
            )}

            <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-label="Abrir menú" className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
              <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
            <form onSubmit={handleSearchCommit} className="mb-3 flex h-10 items-center rounded-full border border-border bg-muted/60 px-3 sm:hidden">
              <span className="material-symbols-outlined text-lg text-muted-foreground">search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar anime..." className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
            </form>
            <nav className="mx-auto grid max-w-7xl gap-1">
              {visibleNavItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className={`rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {item.label}
                </Link>
              ))}
              {!user && <button onClick={() => { setIsMenuOpen(false); setIsAuthModalOpen(true); }} className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Iniciar sesión</button>}
            </nav>
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
