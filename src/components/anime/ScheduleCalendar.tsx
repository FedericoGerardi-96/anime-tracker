"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { SCHEDULE_SEASONS } from '@/lib/schedule-filters';
import AnimeCard, { type AnimeCardProps } from "@/components/cards/AnimeCard";
import AddToListModal from "@/components/ui/AddToListModal";
import AuthModal from "@/components/auth/AuthModal";
import { requestListDialog } from '@/lib/list-dialog-request';
import type { ListDialogResult } from '@/interfaces/list-dialog';
import type { CatalogAnime } from "@/interfaces/media-catalog";

interface ScheduleCalendarProps {
  weeklySchedules: Record<string, CatalogAnime[]>;
  favoriteMalIds: number[] | null;
  userId?: string;
  seasonAnime: CatalogAnime[];
  year: number;
  season: string;
  years: number[];
  filterMode: 'all' | 'followed';
  hasWeeklySchedule: boolean;
}

const DAYS_OF_WEEK = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

export default function ScheduleCalendar({
  weeklySchedules,
  favoriteMalIds,
  userId, seasonAnime, year, season, years, filterMode, hasWeeklySchedule,
}: Readonly<ScheduleCalendarProps>) {
  // Get active day of the week by default (0 is Sunday, 1 is Monday...)
  const currentDayIndex = new Date().getDay();
  const defaultDay = DAYS_OF_WEEK[currentDayIndex === 0 ? 6 : currentDayIndex - 1].id;

  const [activeDay, setActiveDay] = useState<string>(hasWeeklySchedule ? defaultDay : 'season');
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    params.set('season', season);
    for (const [name, value] of Object.entries(updates)) params.set(name, value);
    startNavigation(() => router.replace(`/anime/schedule?${params.toString()}`, { scroll: false }));
  };

  // State for AddToListModal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeCardProps | null>(null);
  const [dataPromise, setDataPromise] = useState<Promise<ListDialogResult> | null>(null);

  const handleAddClick = (anime: AnimeCardProps) => {
    if (!userId) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedAnime(anime);
    setDataPromise(requestListDialog(Number(anime.id), 'anime'));
    setIsModalOpen(true);
  };

  const dayAnime = activeDay === 'season' ? seasonAnime : weeklySchedules[activeDay] || [];
  const isLoggedIn = !!userId;

  // Filter based on selected mode
  const filteredAnime = dayAnime.filter((anime) => {
    if (filterMode === "followed") {
      return favoriteMalIds?.includes(anime.mal_id) ?? false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-8">
      {/* Upper Control Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            Calendario de anime
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{hasWeeklySchedule ? 'Explorá la temporada o consultá las emisiones de cada día.' : 'Explorá los animes estrenados en esta temporada.'}</p>
        </div>
        
        {/* Toggle Mode */}
        {isLoggedIn ? (
          <div className="flex max-w-fit self-start rounded-xl border border-border bg-background p-1 sm:self-auto">
            <button type="button"
              disabled={isNavigating} aria-pressed={filterMode === "all"} onClick={() => updateFilters({ mode: "all" })}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                filterMode === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button type="button"
              disabled={isNavigating} aria-pressed={filterMode === "followed"} onClick={() => updateFilters({ mode: "followed" })}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                filterMode === "followed"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              Mis favoritos
            </button>
          </div>
        ) : (
          <div className="max-w-fit rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Iniciá sesión para filtrar por favoritos
          </div>
        )}
      </div>

      <div className="space-y-3" aria-busy={isNavigating}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            Año
            <select aria-label="Año de estreno" value={years.length ? year : ''} disabled={isNavigating || !years.length}
              onChange={event => updateFilters({ year: event.target.value })}
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-primary disabled:opacity-50 cursor-pointer">
              {!years.length && <option value="">Sin años disponibles</option>}
              {years.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div aria-label="Temporada" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
            {SCHEDULE_SEASONS.map(item => <button type="button" key={item.value} disabled={isNavigating || !years.length}
              aria-pressed={season === item.value} onClick={() => updateFilters({ season: item.value })}
              className={`rounded-lg px-4 py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50 ${season === item.value ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              {item.label}
            </button>)}
          </div>
          {isNavigating && <span role="status" className="text-xs text-muted-foreground">Cargando temporada…</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          {filterMode === 'followed' ? 'Los años disponibles corresponden a tus favoritos con año de estreno conocido.' : 'Seleccioná un año y una temporada para explorar sus estrenos.'}
          {!hasWeeklySchedule && years.length > 0 && ' Esta vista muestra títulos de la temporada, sin atribuirles horarios históricos de emisión.'}
        </p>
      </div>

      {/* Days of the Week Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {[{ id: 'season', label: 'Temporada completa' }, ...(hasWeeklySchedule ? DAYS_OF_WEEK : [])].map((day) => {
          const isSelected = activeDay === day.id;
          const dayAnimeList = day.id === 'season' ? seasonAnime : weeklySchedules[day.id] || [];
          const count = filterMode === "followed"
            ? dayAnimeList.filter((anime) => favoriteMalIds?.includes(anime.mal_id)).length
            : dayAnimeList.length;
          
          return (
            <button type="button"
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {day.label}
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Anime Grid */}
      {filteredAnime.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <span className="material-symbols-outlined mb-4 animate-pulse text-5xl text-muted-foreground">calendar_today</span>
          <h3 className="text-lg font-bold text-foreground">{activeDay === 'season' ? 'No hay animes para estos filtros' : 'No hay emisiones'}</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {!years.length ? 'Tus favoritos todavía no tienen un año de estreno conocido.' : activeDay === 'season'
              ? filterMode === 'followed' ? 'No tenés favoritos en esta temporada. Probá otra temporada o año.' : 'No hay estrenos disponibles para esta temporada.'
              : filterMode === 'followed' ? 'No tenés animes favoritos que se emitan este día.' : 'No hay emisiones programadas para este día.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {filteredAnime.map((anime) => {
            const mappedCard = {
              id: anime.mal_id,
              title: anime.title_english || anime.title,
              image: anime.images.webp.large_image_url,
              score: anime.score ?? 0,
              studio: anime.studios[0]?.name || "Estudio desconocido",
              year: anime.year ?? 0,
              isAiring: anime.airing,
              synopsis: anime.synopsis ?? undefined,
              season: anime.season ?? undefined,
              genres: anime.genres.map((genre) => genre.name),
              tags: anime.tags ?? [],
              format: anime.type,
              status: anime.status,
              totalUnits: anime.episodes ?? undefined,
              episodes: anime.episodes ?? undefined,
              type: "anime" as const,
            };
            return (
              <AnimeCard
                key={anime.mal_id}
                {...mappedCard}
                isFavorite={favoriteMalIds?.includes(anime.mal_id) ?? false}
                userId={userId}
                onAddClick={handleAddClick}
              />
            );
          })}
        </div>
      )}

      {/* Authentication and List Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AddToListModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAnime(null);
          setDataPromise(null);
        }}
        mode="add-anime"
        animeData={selectedAnime ? {
          mal_id: Number(selectedAnime.id),
          title: selectedAnime.title,
          image: selectedAnime.image,
          type: selectedAnime.type || 'anime',
          synopsis: selectedAnime.synopsis,
          season: selectedAnime.season,
          tags: selectedAnime.tags,
          episodes: selectedAnime.episodes,
          score: selectedAnime.score
        } : undefined}
        dataPromise={dataPromise}
      />
    </div>
  );
}
