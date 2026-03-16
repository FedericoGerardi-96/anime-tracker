import { JikanAnime, JikanResponse, JikanSearchParams, JikanCharacter, JikanEpisode, JikanRecommendation } from "@/types/jikan";
import { AnimeCardProps } from "@/components/cards/AnimeCard";

const JIKAN_API_BASE = "https://api.jikan.moe/v4";

export async function getAnimeById(id: number): Promise<JikanAnime> {
  const response = await fetch(`${JIKAN_API_BASE}/anime/${id}`, {
    next: { revalidate: 86400 } // Revalidate once a day
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
  if (!response.ok) return []; // Some series might not have episode list
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


export interface FilterParams {
  q?: string;
  genre?: string;
  status?: string;
  season?: string;
  sort?: string;
  page?: string | number;
}

export async function getAnimeList(params: FilterParams = {}): Promise<JikanResponse<JikanAnime[]>> {
  const url = new URL(`${JIKAN_API_BASE}/anime`);
  
  const jikanParams: JikanSearchParams = {
    sfw: true, // Safety first
  };

  if (params.q) jikanParams.q = params.q;
  if (params.page) jikanParams.page = Number(params.page);
  
  // Status mapping
  if (params.status === "airing") jikanParams.status = "airing";
  if (params.status === "completed") jikanParams.status = "complete";
  
  // Genre mapping (Simplified for now with common IDs)
  const genreMap: Record<string, number> = {
    action: 1,
    adventure: 2,
    comedy: 4,
    drama: 8,
    fantasy: 10,
    romance: 22,
  };
  if (params.genre && genreMap[params.genre]) {
    jikanParams.genres = genreMap[params.genre].toString();
  }

  // Sort mapping
  if (params.sort === "popularity") {
    jikanParams.order_by = "popularity";
    jikanParams.sort = "desc";
  } else if (params.sort === "score") {
    jikanParams.order_by = "score";
    jikanParams.sort = "desc";
  } else if (params.sort === "recent") {
    jikanParams.order_by = "start_date";
    jikanParams.sort = "desc";
  }

  // Append all mapped params to URL
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
    isFavorite: false, // This will be handled by our DB later
  };
}
