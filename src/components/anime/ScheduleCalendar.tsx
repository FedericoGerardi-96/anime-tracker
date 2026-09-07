"use client";

import { useState } from "react";
import AnimeCard, { type AnimeCardProps } from "@/components/cards/AnimeCard";
import AddToListModal from "@/components/ui/AddToListModal";
import AuthModal from "@/components/auth/AuthModal";
import { getAnimeListAssociations } from "@/lib/actions/lists";
import type { CatalogAnime } from "@/interfaces/media-catalog";

interface ScheduleCalendarProps {
  weeklySchedules: Record<string, CatalogAnime[]>;
  favoriteMalIds: number[] | null;
  userId?: string;
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
  userId,
}: Readonly<ScheduleCalendarProps>) {
  // Get active day of the week by default (0 is Sunday, 1 is Monday...)
  const currentDayIndex = new Date().getDay();
  const defaultDay = DAYS_OF_WEEK[currentDayIndex === 0 ? 6 : currentDayIndex - 1].id;

  const [activeDay, setActiveDay] = useState<string>(defaultDay);
  const [filterMode, setFilterMode] = useState<"all" | "followed">("all");

  // State for AddToListModal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeCardProps | null>(null);
  const [initialListIds, setInitialListIds] = useState<string[]>([]);

  const handleAddClick = async (anime: AnimeCardProps) => {
    if (!userId) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedAnime(anime);
    setIsModalOpen(true);
    
    const associations = await getAnimeListAssociations(Number(anime.id));
    setInitialListIds(associations);
  };

  const dayAnime = weeklySchedules[activeDay] || [];
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl shadow-black/10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            Calendario semanal
          </h2>
          <p className="text-sm text-slate-400 mt-1">Consultá qué anime se emite cada día</p>
        </div>
        
        {/* Toggle Mode */}
        {isLoggedIn ? (
          <div className="flex p-1 bg-slate-950/80 rounded-xl border border-white/5 max-w-fit self-start sm:self-auto">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                filterMode === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMode("followed")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                filterMode === "followed"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              Mis favoritos
            </button>
          </div>
        ) : (
          <div className="text-xs bg-slate-800/30 px-3 py-2 rounded-xl text-slate-400 border border-white/5 max-w-fit">
            Iniciá sesión para filtrar por favoritos
          </div>
        )}
      </div>

      {/* Days of the Week Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent border-b border-white/5">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = activeDay === day.id;
          const dayAnimeList = weeklySchedules[day.id] || [];
          const count = filterMode === "followed"
            ? dayAnimeList.filter((anime) => favoriteMalIds?.includes(anime.mal_id)).length
            : dayAnimeList.length;
          
          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              {day.label}
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500"
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
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-dashed border-white/5 rounded-2xl text-center">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-4 animate-pulse">calendar_today</span>
          <h3 className="text-lg font-bold text-slate-300">No hay emisiones</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            {filterMode === "followed" 
              ? "No tenés animes favoritos que se emitan este día."
              : "No hay emisiones programadas para este día."}
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
              tags: anime.genres.map((genre) => genre.name),
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
          setInitialListIds([]);
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
        initialListIds={initialListIds}
      />
    </div>
  );
}
