import 'server-only';
import { providerRead, ProviderRequestError } from '@/services/provider-request';
import { getCatalogProvider } from '@/services/catalog-provider';
import { cache } from 'react';
import { parseAnimeRelations } from '@/lib/anime-relations';

import type { CatalogAnime, CatalogManga } from '@/interfaces/media-catalog';
import type { AnimeCharacter } from '@/interfaces/character';
import { getMalAnimeById, getMalMangaById } from '@/lib/myanimelist-service';
import { scrapeMalAnimeCharacters } from '@/services/myanimelist-characters-scraper';

const ENDPOINT = 'https://graphql.anilist.co';
const QUERY = `query Detail($idMal: Int, $type: MediaType, $includeCharacters: Boolean!) {
  Media(idMal: $idMal, type: $type) {
    id idMal bannerImage title { romaji english native } coverImage { extraLarge large medium }
    averageScore meanScore popularity favourites status format season seasonYear startDate { year month day } endDate { year month day } source duration synonyms
    episodes chapters volumes description(asHtml: false) genres
    studios(isMain: true) { nodes { id name } }
    staff(sort: RELEVANCE, perPage: 5) { edges { role node { id name { full } } } }
    rankings { rank type allTime context }
    relations { edges { relationType node { idMal type format title { romaji english } coverImage { extraLarge large medium } } } }
    characters(page: 1, perPage: 6, role: MAIN, sort: [RELEVANCE, ID]) @include(if: $includeCharacters) {
      nodes { id name { full } image { medium } }
    }
  }
}`;

interface FuzzyDate { year?: number | null; month?: number | null; day?: number | null }

function partialDate(date?: FuzzyDate): string | null {
  if (!date?.year) return null;
  const year = String(date.year);
  if (!date.month) return year;
  const month = `${year}-${String(date.month).padStart(2, '0')}`;
  return date.day ? `${month}-${String(date.day).padStart(2, '0')}` : month;
}

function detailMetadata(media: DetailMedia) {
  return {
    title_japanese: media.title.native ?? null,
    title_synonyms: media.synonyms ?? [],
    start_date: partialDate(media.startDate),
    end_date: partialDate(media.endDate),
    duration_minutes: media.duration ?? null,
  };
}

type CharacterPreview = Pick<AnimeCharacter, 'id' | 'malId' | 'name' | 'image' | 'provider'>;

interface DetailMedia {
  relations?: { edges?: Array<{
    relationType: string;
    node?: {
      idMal: number | null; type: string; format: string | null;
      title: { romaji: string; english: string | null };
      coverImage?: { extraLarge?: string; large?: string; medium?: string };
    } | null;
  }> };
  characters?: { nodes?: Array<{ id: number; name?: { full?: string }; image?: { medium?: string } } | null> };
  id?: number;
  bannerImage?: string | null;
  idMal: number; title: { romaji: string; english?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number | null; popularity?: number | null; favourites?: number | null;
  status?: string | null; format?: string | null; season?: string | null; seasonYear?: number | null;
  startDate?: FuzzyDate;
  endDate?: FuzzyDate;
  source?: string | null;
  duration?: number | null;
  synonyms?: string[];
  episodes?: number | null; chapters?: number | null; volumes?: number | null; description?: string | null;
  genres?: string[];
  studios?: { nodes?: Array<{ id: number; name: string }> };
  staff?: { edges?: Array<{ role: string; node: { id: number; name: { full: string } } }> };
  rankings?: Array<{ rank: number; type: string; allTime?: boolean; context?: string }>;
}

const fetchDetail = cache(async (idMal: number, type: 'ANIME' | 'MANGA'): Promise<DetailMedia> => {
  const payload = await providerRead<{ data?: { Media?: DetailMedia }; errors?: Array<{ message: string }> }>('anilist', 'detail', ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { idMal, type, includeCharacters: type === 'ANIME' } }),
    signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 },
  });
  if (!payload.data?.Media || payload.errors?.length) throw new ProviderRequestError('anilist', 404);
  return payload.data.Media;
});

export async function getAnimeRelationData(malId: number) {
  return (await fetchDetail(malId, 'ANIME')).relations;
}

export async function getAnimeRelations(malId: number) {
  return parseAnimeRelations(await getAnimeRelationData(malId), malId);
}

export async function getAnimeCharacterPreview(malId: number): Promise<CharacterPreview[]> {
  if (await getCatalogProvider() === 'myanimelist') {
    const characters = await scrapeMalAnimeCharacters(malId);
    return characters.filter(character => character.role === 'MAIN').slice(0, 6);
  }
  const media = await fetchDetail(malId, 'ANIME');
  return (media.characters?.nodes ?? []).flatMap(character =>
    character?.name?.full && Number.isSafeInteger(character.id)
      ? [{ id: character.id, name: character.name.full, image: character.image?.medium ?? '', provider: 'anilist' }]
      : [],
  );
}

// Optional enrichment must never prevent reading the selected provider's detail.
export const getAnimePresentation = cache(async (malId: number) => {
  const provider = await getCatalogProvider();
  const [ani, mal] = await Promise.all([
    fetchDetail(malId, 'ANIME').catch(() => null),
    provider === 'myanimelist' ? Promise.resolve(null) : getMalAnimeById(malId).catch(() => null),
  ]);
  let banner: string | null = null;
  try {
    const url = new URL(ani?.bannerImage ?? '');
    if (url.protocol === 'https:' && url.hostname === 's4.anilist.co') banner = url.href;
  } catch { /* Missing or invalid artwork uses the typographic background. */ }
  const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 10 ? value : null;
  return { banner, anilistId: Number.isSafeInteger(ani?.id) ? ani?.id : undefined,
    anilistScore: score(ani?.averageScore ? ani.averageScore / 10 : null), malScore: score(mal?.score) };
});

function images(media: DetailMedia) {
  const large = media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '';
  const medium = media.coverImage?.medium || media.coverImage?.large || large;
  return { jpg: { image_url: medium, small_image_url: medium, large_image_url: large }, webp: { image_url: medium, small_image_url: medium, large_image_url: large } };
}

function genreList(media: DetailMedia) {
  return (media.genres ?? []).map((name, index) => ({ mal_id: -(index + 1), name }));
}

function rank(media: DetailMedia) {
  return media.rankings?.find((item) => item.type === 'RATED' && item.allTime)?.rank ?? null;
}

export const getPreferredAnimeByMalId = cache(async (idMal: number): Promise<CatalogAnime> => {
  if (await getCatalogProvider() === 'myanimelist') return getMalAnimeById(idMal);
  {
    const media = await fetchDetail(idMal, 'ANIME');
    return {
      ...detailMetadata(media),
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null, title_romaji: media.title.romaji,
      type: media.format ?? 'TV', source: media.source ?? '', episodes: media.episodes ?? null, status: media.status ?? '',
      airing: media.status === 'RELEASING', score: media.averageScore ? media.averageScore / 10 : null,
      scored_by: media.favourites ?? null, rank: rank(media), popularity: media.popularity ?? 0,
      synopsis: media.description ?? null, season: media.season?.toLowerCase() ?? null, year: media.seasonYear ?? media.startDate?.year ?? null,
      studios: media.studios?.nodes?.map((studio) => ({ mal_id: studio.id, name: studio.name })) ?? [],
      genres: genreList(media), tags: [],
    };
  }
});

export const getPreferredMangaByMalId = cache(async (idMal: number): Promise<CatalogManga> => {
  if (await getCatalogProvider() === 'myanimelist') return getMalMangaById(idMal);
  {
    const media = await fetchDetail(idMal, 'MANGA');
    const authors = media.staff?.edges?.filter((edge) => /story|art|original creator/i.test(edge.role)).map((edge) => ({ mal_id: edge.node.id, name: edge.node.name.full })) ?? [];
    return {
      ...detailMetadata(media),
      mal_id: idMal, images: images(media), title: media.title.romaji, title_english: media.title.english ?? null, title_romaji: media.title.romaji,
      type: media.format ?? 'MANGA', year: media.startDate?.year ?? media.seasonYear ?? null, chapters: media.chapters ?? null,
      volumes: media.volumes ?? null, status: media.status ?? '', publishing: media.status === 'RELEASING',
      score: media.averageScore ? media.averageScore / 10 : null, scored_by: media.favourites ?? null,
      rank: rank(media), popularity: media.popularity ?? 0, synopsis: media.description ?? null,
      authors, genres: genreList(media), tags: [],
    };
  }
});
