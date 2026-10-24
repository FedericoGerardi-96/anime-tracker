'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import { useClientSearch } from '@/hooks/useClientSearch';
import type { CatalogSuggestion } from '@/interfaces/client-search';
import AuthModal from '@/components/auth/AuthModal';
import Dropdown from '@/components/dropdown/dropdown';
import { logout } from '@/lib/actions/auth';
import { slugify } from '@/lib/utils';
import type { IProfile } from '@/types/profile';
import { THEME_COOKIE, type Theme } from '@/lib/theme';
import { DEFAULT_PROFILE_AVATAR, getProfileAvatar, profileAvatarBackground } from '@/lib/profile-avatar';

type SearchType = 'anime' | 'manga' | 'character';

const SEARCH_OPTIONS = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'character', label: 'Personaje' },
];

const NAV_ITEMS = [
  { href: '/', label: 'Inicio' },
  { href: '/anime', label: 'Anime' },
  { href: '/manga', label: 'Manga' },
  { href: '/anime/schedule', label: 'Calendario' },
  { href: '/favorites', label: 'Favoritos', private: true },
  { href: '/lists', label: 'Mis listas', private: true },
  { href: '/hentai', label: 'Hentai', private: true, adult: true },
];

function subscribeTheme(callback: () => void) {
  window.addEventListener('anitrack-theme-change', callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_COOKIE || (event.newValue !== 'dark' && event.newValue !== 'light')) return;
    document.documentElement.classList.toggle('dark', event.newValue === 'dark');
    callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('anitrack-theme-change', callback);
    window.removeEventListener('storage', onStorage);
  };
}

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}

export default function TopbarClient({ user, profile, initialTheme }: Readonly<{ user?: User | null; profile?: IProfile | null; initialTheme: Theme }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<SearchType>('anime');
  const selectedSearchLabel = SEARCH_OPTIONS.find((option) => option.value === searchType)?.label ?? 'Anime';
  const { data: searchResults, loading: isSearching, error: searchError } = useClientSearch<CatalogSuggestion>(query.trim().length >= 3 ? `/api/catalog/search?type=${searchType}&q=${encodeURIComponent(query.trim())}` : null, 500);
  const suggestions = searchResults.slice(0, 5);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchUnavailable = Boolean(searchError);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const isDark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => initialTheme === 'dark');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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


  const handleSearchCommit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    setIsMenuOpen(false);
    const destination = searchType === 'character' ? '/characters' : `/${searchType}`;
    router.push(`${destination}?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (item: CatalogSuggestion) => {
    setShowSuggestions(false);
    setQuery('');
    if (searchType === 'character') {
      const characterId = item.provider === 'myanimelist' ? `mal-${item.mal_id}` : item.mal_id;
      router.push(`/characters/${characterId}-${slugify(item.name || '')}`);
      return;
    }
    router.push(`/${searchType}/${item.mal_id}-${slugify(item.title_english || item.title || '')}`);
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
    const nextTheme = nextThemeIsDark ? 'dark' : 'light';
    document.cookie = `${THEME_COOKIE}=${nextTheme}; Max-Age=31536000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    window.localStorage.setItem(THEME_COOKIE, nextTheme);
    window.dispatchEvent(new Event('anitrack-theme-change'));
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

          <nav className="ml-3 hidden items-center gap-0.5 xl:flex 2xl:gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium transition-colors 2xl:px-3 ${
                  isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div ref={searchContainerRef} className="relative hidden sm:block">
              <form onSubmit={handleSearchCommit} className="flex h-9 w-64 items-center rounded-full border border-border bg-muted/60 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 md:w-[28rem] xl:w-72 2xl:w-80">
                <Dropdown
                  value={searchType}
                  onChange={(value) => { setSearchType(value as SearchType); setShowSuggestions(query.trim().length >= 3); }}
                  options={SEARCH_OPTIONS}
                  ariaLabel={`Tipo de búsqueda: ${selectedSearchLabel}`}
                  className="w-auto! shrink-0"
                  buttonClassName="h-8 border-0! bg-transparent! px-3! py-0! text-xs! text-muted-foreground! hover:text-foreground! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  menuClassName="min-w-36!"
                />
                <span className={`material-symbols-outlined ml-1 text-base text-muted-foreground ${isSearching ? 'animate-spin' : ''}`}>
                  {isSearching ? 'progress_activity' : 'search'}
                </span>
                <input
                  aria-label="Buscar anime, manga o personajes"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setShowSuggestions(event.target.value.trim().length >= 3); }}
                  onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar..."
                  autoComplete="off"
                />
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-80 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-2xl">
                  {suggestions.map((item) => {
                    const name = (searchType === 'character' ? item.name : item.title_english || item.title) || '';
                    const image = item.images?.webp?.small_image_url || item.images?.jpg?.small_image_url;
                    return (
                      <button type="button" key={`${item.provider ?? searchType}-${item.mal_id}`} onClick={() => handleSuggestionClick(item)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted">
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
              {showSuggestions && isSearching && <div role="status" className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Buscando…</div>}
              {showSuggestions && !isSearching && !searchUnavailable && query.trim().length >= 3 && suggestions.length === 0 && <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No encontramos resultados.</div>}
              {showSuggestions && searchUnavailable && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-80 rounded-2xl border border-amber-500/25 bg-popover p-4 text-sm shadow-2xl">
                  <p className="flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-lg text-amber-500">cloud_off</span>
                    {searchType === 'character' ? 'Los proveedores de personajes no están disponibles' : 'Búsqueda temporalmente no disponible'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {searchType === 'character'
                      ? 'No pudimos consultar ni AniList ni MyAnimeList. Probá nuevamente más tarde.'
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
                  <span className="block size-full bg-cover bg-center" style={{ backgroundImage: profileAvatarBackground(getProfileAvatar(profile?.avatar, user.user_metadata?.avatar_url) ?? DEFAULT_PROFILE_AVATAR) }} />
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-full w-40 pt-2" role="menu">
                    <div className="rounded-xl border border-border bg-popover p-1 shadow-xl">
                      <Link href="/profile" role="menuitem" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mi perfil</Link>
                      <Link href="/friends" role="menuitem" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Amigos</Link>
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

            <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={isMenuOpen} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground xl:hidden">
              <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-border bg-background px-4 py-4 xl:hidden">
            <form onSubmit={handleSearchCommit} className="mb-3 flex h-10 items-center rounded-full border border-border bg-muted/60 px-2 sm:hidden">
              <Dropdown
                value={searchType}
                onChange={(value) => setSearchType(value as SearchType)}
                options={SEARCH_OPTIONS}
                ariaLabel={`Tipo de búsqueda: ${selectedSearchLabel}`}
                className="w-auto! shrink-0"
                buttonClassName="h-8 border-0! bg-transparent! px-2! py-0! text-xs! text-muted-foreground! hover:text-foreground!"
                menuClassName="min-w-36!"
              />
              <input aria-label={`Buscar ${selectedSearchLabel.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${searchType === 'character' ? 'personajes' : searchType}...`} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
              <button type="submit" aria-label="Buscar" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">search</span>
              </button>
            </form>
            <nav className="mx-auto grid max-w-7xl gap-1">
              {visibleNavItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className={`rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {item.label}
                </Link>
              ))}
              {!user && <button type="button" onClick={() => { setIsMenuOpen(false); setIsAuthModalOpen(true); }} className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Iniciar sesión</button>}
            </nav>
          </div>
        )}
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
