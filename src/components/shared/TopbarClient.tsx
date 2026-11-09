'use client';

import { useEffect, useRef, useState } from 'react';
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
import { DEFAULT_PROFILE_AVATAR, getProfileAvatar, profileAvatarBackground } from '@/lib/profile-avatar';

type SearchType = 'anime' | 'manga' | 'character';

const SEARCH_OPTIONS = [
  { value: 'anime', label: 'Anime' },
  { value: 'manga', label: 'Manga' },
  { value: 'character', label: 'Personaje' },
];

const NAV_ITEMS = [
  { href: '/', label: 'Inicio' },
  { href: '/anime', label: 'Catálogo' },
  { href: '/anime/schedule', label: 'Calendario' },
  { href: '/lists', label: 'Mis listas', private: true },
  { href: '/hentai', label: 'Hentai', private: true, adult: true },
];

export default function TopbarClient({ user, profile }: Readonly<{ user?: User | null; profile?: IProfile | null }>) {
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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.matchMedia('(min-width: 640px)').matches) {
          desktopSearchRef.current?.focus();
        } else {
          setIsMenuOpen(true);
          window.requestAnimationFrame(() => mobileSearchRef.current?.focus());
        }
      } else if (event.key === 'Escape') {
        setShowSuggestions(false);
        if (isAccountMenuOpen) {
          setIsAccountMenuOpen(false);
          accountButtonRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAccountMenuOpen]);


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
    .filter((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)) || (item.href === '/anime' && (pathname === '/manga' || pathname.startsWith('/manga/'))))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
  const isActive = (href: string) => href === activeNavHref;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="page-frame flex h-[68px] items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setIsMenuOpen(false)}>
            <svg className="size-9 shrink-0" viewBox="-3 -3 42 42" aria-hidden="true">
              <defs>
                <linearGradient id="brand-progress" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--brand-mint)" />
                  <stop offset="1" stopColor="var(--brand-aurora)" />
                </linearGradient>
              </defs>
              <circle cx="18" cy="18" r="13" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="4" />
              <path d="M18 5 A13 13 0 1 1 5 18" fill="none" stroke="url(#brand-progress)" strokeWidth="4" strokeLinecap="round" />
              <path d="M15 12.6 L24 18 L15 23.4 Z" fill="currentColor" />
              <path d="M5 11.5 L6.3 16.7 L11.5 18 L6.3 19.3 L5 24.5 L3.7 19.3 L-1.5 18 L3.7 16.7 Z" fill="var(--brand-sakura)" />
            </svg>
            <span className="text-lg font-bold tracking-tight">Ani<span className="brand-accent">Track</span></span>
          </Link>

          <nav aria-label="Principal" className="ml-3 hidden items-center gap-0.5 xl:flex 2xl:gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`whitespace-nowrap rounded-[10px] px-2 py-2.5 text-sm font-semibold transition-colors 2xl:px-3 ${
                  isActive(item.href) ? 'bg-accent text-foreground shadow-[inset_0_-2px_0_var(--primary-color)]' : 'text-muted-foreground hover:bg-muted/60 hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div ref={searchContainerRef} className="relative hidden sm:block">
              <form onSubmit={handleSearchCommit} className="flex h-[42px] w-64 items-center gap-1 rounded-xl border border-border bg-card/70 px-2 transition-colors focus-within:border-primary! focus-within:ring-2 focus-within:ring-primary/20 md:w-80 xl:w-72 2xl:w-80">
                <span aria-hidden="true" className={`material-symbols-outlined ml-1 text-lg text-muted-foreground ${isSearching ? 'animate-spin motion-reduce:animate-none' : ''}`}>
                  {isSearching ? 'progress_activity' : 'search'}
                </span>
                <input
                  ref={desktopSearchRef}
                  aria-label="Buscar anime, manga o personajes"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setShowSuggestions(event.target.value.trim().length >= 3); }}
                  onFocus={() => query.length >= 3 && setShowSuggestions(true)}
                  className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground focus-visible:outline-none! placeholder:text-muted-foreground"
                  placeholder="Buscar"
                  autoComplete="off"
                />
                <Dropdown
                  value={searchType}
                  onChange={(value) => { setSearchType(value as SearchType); setShowSuggestions(query.trim().length >= 3); }}
                  options={SEARCH_OPTIONS}
                  ariaLabel={`Tipo de búsqueda: ${selectedSearchLabel}`}
                  className="w-auto! shrink-0"
                  buttonClassName="h-8 gap-1! border-0! bg-transparent! px-1! py-0! text-xs! text-muted-foreground! hover:text-foreground! focus-visible:ring-2 focus-visible:ring-primary/40"
                  menuClassName="min-w-36!"
                />
                <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">Ctrl K</kbd>
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
                    Búsqueda temporalmente no disponible
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {searchError}
                  </p>
                  <Link href={`/${searchType === "character" ? "characters" : searchType}?q=${encodeURIComponent(query)}`} className="mt-2 inline-block underline">Abrir búsqueda y elegir proveedor</Link>
                </div>
              )}
            </div>

            {!user && <Link href="/settings/appearance" aria-label="Ajustes de apariencia" className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><span aria-hidden="true" className="material-symbols-outlined">settings</span></Link>}
            {user ? (
              <div
                ref={accountMenuRef}
                className="relative"
                onMouseEnter={openAccountMenu}
                onMouseLeave={scheduleAccountMenuClose}
              >
                <button
                  type="button"
                  ref={accountButtonRef}
                  aria-label="Abrir menú de cuenta"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="block size-11 rounded-full p-[2px] transition hover:brightness-110"
                  style={{ background: 'conic-gradient(from 200deg, var(--brand-aurora), var(--brand-mint), var(--brand-sakura), var(--brand-aurora))' }}
                >
                  <span className="block size-full rounded-full border-2 border-background bg-cover bg-center" style={{ backgroundImage: profileAvatarBackground(getProfileAvatar(profile?.avatar, user.user_metadata?.avatar_url) ?? DEFAULT_PROFILE_AVATAR) }} />
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-full w-40 pt-2" role="menu">
                    <div className="rounded-xl border border-border bg-popover p-1 shadow-xl">
                      <Link href="/profile" role="menuitem" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mi perfil</Link>
                      <Link href="/settings/appearance" role="menuitem" onClick={() => setIsAccountMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Ajustes</Link>
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
            <form onSubmit={handleSearchCommit} className="mb-3 flex h-11 items-center rounded-xl border border-border bg-card/70 px-2 focus-within:border-primary! focus-within:ring-2 focus-within:ring-primary/20 sm:hidden">
              <button type="submit" aria-label="Buscar" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-primary">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">search</span>
              </button>
              <input ref={mobileSearchRef} aria-label={`Buscar ${selectedSearchLabel.toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent px-2 text-sm focus-visible:outline-none!" />
              <Dropdown
                value={searchType}
                onChange={(value) => setSearchType(value as SearchType)}
                options={SEARCH_OPTIONS}
                ariaLabel={`Tipo de búsqueda: ${selectedSearchLabel}`}
                className="w-auto! shrink-0"
                buttonClassName="h-8 border-0! bg-transparent! px-2! py-0! text-xs! text-muted-foreground! hover:text-foreground!"
                menuClassName="min-w-36!"
              />
            </form>
            <nav aria-label="Principal" className="mx-auto grid max-w-7xl gap-1">
              {visibleNavItems.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} onClick={() => setIsMenuOpen(false)} className={`rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(item.href) ? 'bg-accent text-foreground shadow-[inset_0_-2px_0_var(--primary-color)]' : 'text-muted-foreground hover:bg-muted/60 hover:text-primary'}`}>
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
