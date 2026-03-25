import { JikanAnime, JikanManga, JikanResponse, JikanSearchParams, JikanCharacter, JikanEpisode, JikanRecommendation } from "@/types/jikan";
import { AnimeCardProps } from "@/components/cards/AnimeCard";

const JIKAN_API_BASE = "https://api.jikan.moe/v4";

// --- Anime Functions ---

export async function getAnimeById(id: number): Promise<JikanAnime> {
  const response = await fetch(`${JIKAN_API_BASE}/anime/${id}`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error("Failed to fetch anime details");
  const { data } = await response.json();
  return data;
}

export async function getAnimeCharacters(id: number): Promise<JikanCharacter[]> {
  const response = await fetch(`${JIKAN_API_BASE}/anime/${id}/characters`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error("Failed to fetch characters");
  const { data } = await response.json();
  return data;
}

export async function getAnimeEpisodes(id: number): Promise<JikanEpisode[]> {
  const response = await fetch(`${JIKAN_API_BASE}/anime/${id}/episodes`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

export async function getAnimeRecommendations(id: number): Promise<JikanRecommendation[]> {
  const response = await fetch(`${JIKAN_API_BASE}/anime/${id}/recommendations`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

// --- Manga Functions ---

export async function getMangaById(id: number): Promise<JikanManga> {
  const response = await fetch(`${JIKAN_API_BASE}/manga/${id}`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error("Failed to fetch manga details");
  const { data } = await response.json();
  return data;
}

export async function getMangaCharacters(id: number): Promise<any[]> {
  const response = await fetch(`${JIKAN_API_BASE}/manga/${id}/characters`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

export async function getMangaRecommendations(id: number): Promise<JikanRecommendation[]> {
  const response = await fetch(`${JIKAN_API_BASE}/manga/${id}/recommendations`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

// --- Character Functions ---

export async function getCharacterList(q: string, page: number = 1): Promise<any> {
  const response = await fetch(`${JIKAN_API_BASE}/characters?q=${q}&page=${page}&limit=10&sfw=true`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return { data: [], pagination: {} };
  return response.json();
}

export async function getCharacterFullById(id: number): Promise<any> {
  const response = await fetch(`${JIKAN_API_BASE}/characters/${id}/full`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) throw new Error("Failed to fetch character details");
  const { data } = await response.json();
  return data;
}

export async function getSeasons(): Promise<any[]> {
  const response = await fetch(`${JIKAN_API_BASE}/seasons`, {
    next: { revalidate: 86400 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export async function getScheduleToday(): Promise<JikanAnime[]> {
  const day = DAYS[new Date().getDay()];
  const response = await fetch(`${JIKAN_API_BASE}/schedules?filter=${day}&sfw=true&limit=25`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data ?? [];
}

export async function getSeasonNow(limit: number = 12): Promise<JikanAnime[]> {
  const response = await fetch(`${JIKAN_API_BASE}/seasons/now?sfw=true&limit=${limit}`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

export async function getSeasonUpcoming(limit: number = 8): Promise<JikanAnime[]> {
  const response = await fetch(`${JIKAN_API_BASE}/seasons/upcoming?sfw=true&limit=${limit}`, {
    next: { revalidate: 3600 }
  });
   if (!response.ok) return [];
  const { data } = await response.json();
  return data;
}

export interface FilterParams {
  q?: string;
  genre?: string;
  status?: string;
  season?: string;
  sort?: string;
  page?: string | number;
}

export async function getAnimeList(params: FilterParams = {}): Promise<JikanResponse<JikanAnime[]>> {
  return getMediaList('anime', params);
}

export async function getMangaList(params: FilterParams = {}): Promise<JikanResponse<JikanManga[]>> {
  return getMediaList('manga', params);
}

async function getMediaList(type: 'anime' | 'manga', params: FilterParams = {}): Promise<any> {
  let endpoint = `${JIKAN_API_BASE}/${type}`;
  const jikanParams: JikanSearchParams = {
    sfw: true,
  };

  // Seasons only for anime
  if (type === 'anime' && params.season && params.season.includes('-') && !params.q) {
    const [season, year] = params.season.split('-');
    endpoint = `${JIKAN_API_BASE}/seasons/${year}/${season}`;
  }

  if (params.q) jikanParams.q = params.q;
  if (params.page) jikanParams.page = Number(params.page);
  
  if (params.status) {
    if (type === 'anime') {
      if (params.status === "airing") jikanParams.status = "airing";
      if (params.status === "completed") jikanParams.status = "complete";
    } else {
      if (params.status === "publishing") jikanParams.status = "publishing";
      if (params.status === "completed") jikanParams.status = "complete";
    }
  }
  
  const genreMap: Record<string, number> = {
    action: 1,
    adventure: 2,
    comedy: 4,
    drama: 8,
    fantasy: 10,
    romance: 22,
  };
  if (params.genre && genreMap[params.genre.toLowerCase()]) {
    jikanParams.genres = genreMap[params.genre.toLowerCase()].toString();
  }

  if (params.sort === "popularity") {
    jikanParams.order_by = "popularity";
    jikanParams.sort = "desc";
  } else if (params.sort === "score") {
    jikanParams.order_by = "score";
    jikanParams.sort = "desc";
  } else if (params.sort === "recent") {
    jikanParams.order_by = type === 'anime' ? "start_date" : "chapters";
    jikanParams.sort = "desc";
  }

  const url = new URL(endpoint);
  Object.entries(jikanParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`Jikan API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function mapJikanToAnimeCard(anime: JikanAnime): AnimeCardProps {
  return {
    id: anime.mal_id,
    title: anime.title_english || anime.title,
    image: anime.images.webp.large_image_url || anime.images.jpg.large_image_url,
    score: anime.score || 0,
    studio: anime.studios.length > 0 ? anime.studios[0].name : "Unknown",
    year: anime.year || (anime.status === "Airing" ? new Date().getFullYear() : 0),
    isAiring: anime.airing,
    type: 'anime',
    isFavorite: false,
    synopsis: anime.synopsis || undefined,
    season: anime.season || anime.status,
    tags: anime.genres?.map((g: any) => g.name) || [],
    episodes: anime.episodes || undefined,
  };
}

export function mapJikanToMangaCard(manga: JikanManga): AnimeCardProps {
  return {
    id: manga.mal_id,
    title: manga.title_english || manga.title,
    image: manga.images.webp.large_image_url || manga.images.jpg.large_image_url,
    score: manga.score || 0,
    studio: manga.authors.length > 0 ? manga.authors[0].name : "Unknown",
    year: 0, // Manga year usually comes from published.from
    isAiring: manga.publishing,
    type: 'manga',
    isFavorite: false,
    synopsis: manga.synopsis || undefined,
    season: manga.type,
    tags: manga.genres?.map((g: any) => g.name) || [],
    episodes: manga.chapters || undefined, // Mapping chapters to episodes field for compatibility
  };
}
