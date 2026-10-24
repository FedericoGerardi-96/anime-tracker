import "server-only";

import type { AnimeCharacter, CharacterDetail, CharacterSearchResult } from "@/interfaces/character";
import { scrapeMalAnimeCharacters, scrapeMalCharacterSearch } from '@/services/myanimelist-characters-scraper';
import { createClient } from '@/lib/supabase/server';

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export class CharacterProviderUnavailableError extends Error {
  constructor() {
    super("AniList y MyAnimeList no están disponibles para consultar personajes.");
    this.name = "CharacterProviderUnavailableError";
  }
}

interface AniListCharacterEdge {
  role: AnimeCharacter["role"];
  node: {
    id: number;
    name: { full: string; native?: string | null; alternative?: string[] };
    image?: { large?: string; medium?: string };
    description?: string | null;
    gender?: string | null;
    age?: string | null;
    dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null } | null;
    favourites?: number;
    siteUrl?: string;
  };
  voiceActors: Array<{
    id: number;
    name: { full: string; native?: string | null };
    image?: { large?: string; medium?: string };
    languageV2?: string;
    siteUrl?: string;
  }>;
}

interface AniListPageResponse {
  data?: {
    Media?: {
      characters: {
        pageInfo: { hasNextPage: boolean };
        edges: AniListCharacterEdge[];
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const CHARACTERS_QUERY = `
  query CharactersByMalId($malId: Int!, $page: Int!) {
    Media(idMal: $malId, type: ANIME) {
      characters(page: $page, perPage: 25, sort: [ROLE, RELEVANCE, ID]) {
        pageInfo { hasNextPage }
        edges {
          role
          node {
            id
            name { full native alternative }
            image { large medium }
            description
            gender
            age
            favourites
            siteUrl
          }
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
            id
            name { full native }
            image { large medium }
            languageV2
            siteUrl
          }
        }
      }
    }
  }
`;

function cleanDescription(value?: string | null): string | null {
  if (!value) return null;
  return value.replaceAll(/<br\s*\/?>/gi, "\n").replaceAll(/<[^>]+>/g, "").trim();
}

function mapEdge(edge: AniListCharacterEdge): AnimeCharacter {
  return {
    id: edge.node.id,
    provider: 'anilist',
    name: edge.node.name.full,
    nativeName: edge.node.name.native,
    alternativeNames: edge.node.name.alternative ?? [],
    image: edge.node.image?.large || edge.node.image?.medium || "",
    description: cleanDescription(edge.node.description),
    gender: edge.node.gender,
    age: edge.node.age,
    favorites: edge.node.favourites ?? 0,
    url: edge.node.siteUrl || `https://anilist.co/character/${edge.node.id}`,
    role: edge.role,
    voiceActors: edge.voiceActors.map((actor) => ({
      id: actor.id,
      name: actor.name.full,
      nativeName: actor.name.native,
      image: actor.image?.large || actor.image?.medium || "",
      language: actor.languageV2 || "Japanese",
      url: actor.siteUrl || `https://anilist.co/staff/${actor.id}`,
    })),
  };
}

async function fetchAniListCharacters(malId: number): Promise<AnimeCharacter[]> {
  const characters: AnimeCharacter[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= 20) {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: CHARACTERS_QUERY, variables: { malId, page } }),
      cache: "no-store",
    });
    if (!response.ok) throw new CharacterProviderUnavailableError();
    const payload = await response.json() as AniListPageResponse;
    if (payload.errors?.length || !payload.data?.Media) throw new CharacterProviderUnavailableError();
    characters.push(...payload.data.Media.characters.edges.map(mapEdge));
    hasNextPage = payload.data.Media.characters.pageInfo.hasNextPage;
    page += 1;
  }
  return characters;
}

export async function getAnimeCharacters(malId: number): Promise<AnimeCharacter[]> {
  try {
    return await fetchAniListCharacters(malId);
  } catch (error) {
    console.warn('AniList characters unavailable; using MyAnimeList HTML fallback:', error);
    try { return await scrapeMalAnimeCharacters(malId); }
    catch { throw new CharacterProviderUnavailableError(); }
  }
}

interface AniListCharacterResponse {
  data?: { Character?: {
    id: number;
    name: { full: string; native?: string | null; alternative?: string[] };
    image?: { large?: string; medium?: string };
    description?: string | null;
    gender?: string | null;
    age?: string | null;
    dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null } | null;
    favourites?: number;
    siteUrl?: string;
    media?: { edges: Array<{ characterRole?: string | null; voiceActors?: AniListCharacterEdge["voiceActors"]; node: { idMal?: number | null; title: { english?: string | null; romaji: string }; coverImage?: { large?: string; medium?: string }; type: "ANIME" | "MANGA" } }> };
  } };
  errors?: Array<{ message: string }>;
}

const CHARACTER_DETAIL_QUERY = `
  query CharacterDetail($id: Int!) {
    Character(id: $id) {
      id name { full native alternative } image { large medium } description
      dateOfBirth { year month day }
      gender age favourites siteUrl
      media(page: 1, perPage: 25, sort: [POPULARITY_DESC]) {
        edges {
          characterRole
          voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { id name { full native } image { large medium } languageV2 siteUrl }
          node { idMal title { english romaji } coverImage { large medium } type }
        }
      }
    }
  }
`;

async function anilistRequest<T>(query: string, variables: Record<string, string | number>): Promise<T> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }), cache: "no-store",
  });
  if (!response.ok) throw new CharacterProviderUnavailableError();
  return response.json() as Promise<T>;
}

export async function getCharacterById(id: number): Promise<CharacterDetail> {
  const payload = await anilistRequest<AniListCharacterResponse>(CHARACTER_DETAIL_QUERY, { id });
  const character = payload.data?.Character;
  if (!character || payload.errors?.length) throw new CharacterProviderUnavailableError();
  const voiceActors = [...new Map((character.media?.edges ?? []).flatMap((edge) => edge.voiceActors ?? []).map((actor) => [actor.id, actor])).values()];
  return {
    id: character.id, provider: 'anilist', name: character.name.full, nativeName: character.name.native,
    alternativeNames: character.name.alternative ?? [], image: character.image?.large || character.image?.medium || "",
    description: cleanDescription(character.description), gender: character.gender, age: character.age,
    favorites: character.favourites ?? 0, url: character.siteUrl || `https://anilist.co/character/${id}`,
    birthday: character.dateOfBirth?.month && character.dateOfBirth?.day ? `${character.dateOfBirth.month}-${character.dateOfBirth.day}` : null,
    voiceActors: voiceActors.map((actor) => ({ id: actor.id, name: actor.name.full, nativeName: actor.name.native, image: actor.image?.large || actor.image?.medium || "", language: actor.languageV2 || "Japanese", url: actor.siteUrl || `https://anilist.co/staff/${actor.id}` })),
    appearances: (character.media?.edges ?? []).filter((edge) => edge.node.idMal).map((edge) => ({
      malId: Number(edge.node.idMal), title: edge.node.title.english || edge.node.title.romaji,
      image: edge.node.coverImage?.large || edge.node.coverImage?.medium || "", type: edge.node.type, role: edge.characterRole,
    })),
  };
}

export async function getStoredCharacterSnapshot(anilistId: number): Promise<CharacterDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('profile_highlights')
    .select('title, subtitle, image_url')
    .eq('category', 'character').eq('external_id', anilistId).limit(1).maybeSingle();
  if (!data) return null;
  return {
    id: anilistId, provider: 'anilist', name: data.title, nativeName: data.subtitle,
    alternativeNames: [], image: data.image_url || '', description: null,
    favorites: 0, url: `https://anilist.co/character/${anilistId}`,
    voiceActors: [], appearances: [],
  };
}

export async function getStoredCharacterSnapshotByIds(anilistId?: number | null, malId?: number | null): Promise<CharacterDetail | null> {
  if (!anilistId && !malId) return null;
  const supabase = await createClient();
  let query = supabase.from('characters').select('anilist_id, mal_id, name, image_url');
  query = anilistId ? query.eq('anilist_id', anilistId) : query.eq('mal_id', malId as number);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  return {
    id: Number(data.anilist_id || data.mal_id), malId: data.mal_id ?? undefined,
    provider: data.anilist_id ? 'anilist' : 'myanimelist', name: data.name,
    alternativeNames: [], image: data.image_url || '', description: null,
    favorites: 0, url: data.anilist_id ? `https://anilist.co/character/${data.anilist_id}` : `https://myanimelist.net/character/${data.mal_id}`,
    voiceActors: [], appearances: [],
  };
}

interface AniListSearchResponse {
  data?: { Page?: { pageInfo: { hasNextPage: boolean }; characters: Array<AniListCharacterEdge["node"]> } };
  errors?: Array<{ message: string }>;
}

const CHARACTER_SEARCH_QUERY = `
  query CharacterSearch($search: String!, $page: Int!) {
    Page(page: $page, perPage: 20) {
      pageInfo { hasNextPage }
      characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
        id name { full native alternative } image { large medium } description gender age favourites siteUrl
      }
    }
  }
`;

export async function searchCharacters(search: string, page = 1): Promise<CharacterSearchResult> {
  if (!search.trim()) return { characters: [], hasNextPage: false };
  try {
    const payload = await anilistRequest<AniListSearchResponse>(CHARACTER_SEARCH_QUERY, { search: search.trim(), page });
    if (!payload.data?.Page || payload.errors?.length) throw new CharacterProviderUnavailableError();
    return {
      hasNextPage: payload.data.Page.pageInfo.hasNextPage,
      characters: payload.data.Page.characters.map((node) => mapEdge({ role: "BACKGROUND", node, voiceActors: [] })),
    };
  } catch (error) {
    console.warn('AniList character search unavailable; using MyAnimeList HTML fallback:', error);
    try { return await scrapeMalCharacterSearch(search.trim()); }
    catch { throw new CharacterProviderUnavailableError(); }
  }
}
