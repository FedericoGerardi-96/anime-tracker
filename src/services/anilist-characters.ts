import "server-only";

import type { AnimeCharacter, CharacterDetail, CharacterSearchResult, CharacterVoiceActor } from "@/interfaces/character";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class CharacterProviderUnavailableError extends Error {
  constructor() {
    super("AniList no está disponible y este reparto todavía no está guardado en AniTrack.");
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

interface CachedCharacter {
  id: string;
  anilist_id: number;
  name: string;
  native_name: string | null;
  alternative_names: string[];
  image_url: string | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  favorites_count: number;
  source_url: string | null;
}

interface CachedCharacterRow {
  role: AnimeCharacter["role"];
  position: number;
  character: CachedCharacter | CachedCharacter[];
}

async function readCache(malId: number): Promise<{ characters: AnimeCharacter[]; fresh: boolean } | null> {
  const supabase = createSupabaseAdminClient();
  const { data: cache } = await supabase.from("anime_character_cache").select("refreshed_at").eq("anime_mal_id", malId).maybeSingle();
  if (!cache) return null;
  const { data: links, error } = await supabase
    .from("anime_characters")
    .select("role, position, character:characters(id, anilist_id, name, native_name, alternative_names, image_url, description, gender, age, favorites_count, source_url)")
    .eq("anime_mal_id", malId)
    .order("position");
  if (error) return null;

  const normalized = (links ?? []).map((link) => {
    const row = link as unknown as CachedCharacterRow;
    return { ...row, character: Array.isArray(row.character) ? row.character[0] : row.character };
  }).filter((link) => Boolean(link.character));
  const characterIds = normalized.map((link) => link.character.id);
  const { data: voiceLinks } = characterIds.length
    ? await supabase.from("character_voice_actors").select("character_id, language, voice_actor:voice_actors(anilist_id, name, native_name, image_url, language, source_url)").eq("anime_mal_id", malId).in("character_id", characterIds)
    : { data: [] };
  const voicesByCharacter = new Map<string, CharacterVoiceActor[]>();
  for (const link of voiceLinks ?? []) {
    const actorValue = link.voice_actor;
    const actor = Array.isArray(actorValue) ? actorValue[0] : actorValue;
    if (!actor) continue;
    const existing = voicesByCharacter.get(link.character_id) ?? [];
    existing.push({ id: Number(actor.anilist_id), name: actor.name, nativeName: actor.native_name, image: actor.image_url ?? "", language: link.language || actor.language || "Japanese", url: actor.source_url ?? "" });
    voicesByCharacter.set(link.character_id, existing);
  }

  return {
    fresh: Date.now() - Date.parse(cache.refreshed_at) < CACHE_TTL_MS,
    characters: normalized.map(({ character, role }) => ({
      id: Number(character.anilist_id), name: character.name, nativeName: character.native_name,
      alternativeNames: character.alternative_names ?? [], image: character.image_url ?? "",
      description: character.description, gender: character.gender, age: character.age,
      favorites: character.favorites_count, url: character.source_url ?? "", role,
      voiceActors: voicesByCharacter.get(character.id) ?? [],
    })),
  };
}

async function saveCache(malId: number, characters: AnimeCharacter[]): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: characterRows, error } = characters.length ? await supabase.from("characters").upsert(characters.map((character) => ({
    anilist_id: character.id, name: character.name, native_name: character.nativeName ?? null,
    alternative_names: character.alternativeNames, image_url: character.image, description: character.description ?? null,
    gender: character.gender ?? null, age: character.age ?? null, favorites_count: character.favorites,
    source_url: character.url, source_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })), { onConflict: "anilist_id" }).select("id, anilist_id") : { data: [], error: null };
  if (error) throw error;
  const characterIdByAniList = new Map((characterRows ?? []).map((row) => [Number(row.anilist_id), row.id]));

  const actors = [...new Map(characters.flatMap((character) => character.voiceActors).map((actor) => [actor.id, actor])).values()];
  const { data: actorRows, error: actorError } = actors.length
    ? await supabase.from("voice_actors").upsert(actors.map((actor) => ({ anilist_id: actor.id, name: actor.name, native_name: actor.nativeName ?? null, image_url: actor.image, language: actor.language, source_url: actor.url, updated_at: new Date().toISOString() })), { onConflict: "anilist_id" }).select("id, anilist_id")
    : { data: [], error: null };
  if (actorError) throw actorError;
  const actorIdByAniList = new Map((actorRows ?? []).map((row) => [Number(row.anilist_id), row.id]));

  await supabase.from("character_voice_actors").delete().eq("anime_mal_id", malId);
  await supabase.from("anime_characters").delete().eq("anime_mal_id", malId);
  const animeLinks = characters.map((character, position) => ({ anime_mal_id: malId, character_id: characterIdByAniList.get(character.id), role: character.role, position })).filter((row): row is { anime_mal_id: number; character_id: string; role: AnimeCharacter["role"]; position: number } => Boolean(row.character_id));
  if (animeLinks.length) await supabase.from("anime_characters").insert(animeLinks);
  const voiceLinks = characters.flatMap((character) => character.voiceActors.map((actor) => ({ anime_mal_id: malId, character_id: characterIdByAniList.get(character.id), voice_actor_id: actorIdByAniList.get(actor.id), language: actor.language }))).filter((row): row is { anime_mal_id: number; character_id: string; voice_actor_id: string; language: string } => Boolean(row.character_id && row.voice_actor_id));
  if (voiceLinks.length) await supabase.from("character_voice_actors").insert(voiceLinks);
  await supabase.from("anime_character_cache").upsert({ anime_mal_id: malId, refreshed_at: new Date().toISOString() });
}

export async function getAnimeCharacters(malId: number): Promise<AnimeCharacter[]> {
  const cached = await readCache(malId).catch(() => null);
  if (cached?.fresh) return cached.characters;
  try {
    const characters = await fetchAniListCharacters(malId);
    await saveCache(malId, characters).catch((error) => console.error("Could not cache AniList characters:", error));
    return characters;
  } catch (error) {
    if (cached) return cached.characters;
    if (error instanceof CharacterProviderUnavailableError) throw error;
    throw new CharacterProviderUnavailableError();
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
    id: character.id, name: character.name.full, nativeName: character.name.native,
    alternativeNames: character.name.alternative ?? [], image: character.image?.large || character.image?.medium || "",
    description: cleanDescription(character.description), gender: character.gender, age: character.age,
    favorites: character.favourites ?? 0, url: character.siteUrl || `https://anilist.co/character/${id}`,
    voiceActors: voiceActors.map((actor) => ({ id: actor.id, name: actor.name.full, nativeName: actor.name.native, image: actor.image?.large || actor.image?.medium || "", language: actor.languageV2 || "Japanese", url: actor.siteUrl || `https://anilist.co/staff/${actor.id}` })),
    appearances: (character.media?.edges ?? []).filter((edge) => edge.node.idMal).map((edge) => ({
      malId: Number(edge.node.idMal), title: edge.node.title.english || edge.node.title.romaji,
      image: edge.node.coverImage?.large || edge.node.coverImage?.medium || "", type: edge.node.type, role: edge.characterRole,
    })),
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
  const payload = await anilistRequest<AniListSearchResponse>(CHARACTER_SEARCH_QUERY, { search: search.trim(), page });
  if (!payload.data?.Page || payload.errors?.length) throw new CharacterProviderUnavailableError();
  return {
    hasNextPage: payload.data.Page.pageInfo.hasNextPage,
    characters: payload.data.Page.characters.map((node) => mapEdge({ role: "BACKGROUND", node, voiceActors: [] })),
  };
}
