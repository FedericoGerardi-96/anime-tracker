import { getAniListCatalog } from '@/services/anilist-catalog';
import { searchCharacters } from '@/services/anilist-characters';
import { getMalAnimeCatalog, getMalMangaCatalog, mapMalAnimeToCatalog, mapMalMangaToCatalog } from '@/lib/myanimelist-service';
import type { ProfileHighlightCategory } from '@/types/profile-highlights';

async function searchMedia(type: 'anime' | 'manga', query: string) {
  try {
    const result = await getAniListCatalog(type, { q: query, perPage: 8 });
    return result.items.map((item) => ({
      category: type, external_id: item.id, title: item.title,
      subtitle: [item.format, item.year || null].filter(Boolean).join(' · '),
      image_url: item.image, position: 0, provider: 'anilist' as const,
    }));
  } catch (error) {
    console.warn(`AniList ${type} highlight search unavailable; using MyAnimeList fallback:`, error);
    if (type === 'anime') {
      const result = await getMalAnimeCatalog({ q: query, limit: 8 });
      return result.anime.map(mapMalAnimeToCatalog).map((item) => ({
        category: type, external_id: item.mal_id, title: item.title_english || item.title,
        subtitle: [item.type, item.year].filter(Boolean).join(' · '),
        image_url: item.images.webp.large_image_url, position: 0, provider: 'myanimelist' as const,
      }));
    }
    const result = await getMalMangaCatalog({ q: query, limit: 8 });
    return result.manga.map(mapMalMangaToCatalog).map((item) => ({
      category: type, external_id: item.mal_id, title: item.title_english || item.title,
      subtitle: [item.type, item.year].filter(Boolean).join(' · '),
      image_url: item.images.webp.large_image_url, position: 0, provider: 'myanimelist' as const,
    }));
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get('type') as ProfileHighlightCategory | null;
  const query = params.get('q')?.trim() ?? '';
  if (!type || !['anime', 'manga', 'character'].includes(type) || query.length < 2) return Response.json({ data: [] });

  try {
    if (type === 'character') {
      const result = await searchCharacters(query);
      return Response.json({ data: result.characters.slice(0, 8).map((item) => ({
        category: type, external_id: item.id, title: item.name,
        subtitle: item.nativeName || null, image_url: item.image, position: 0, provider: item.provider ?? 'anilist',
      })) });
    }

    return Response.json({ data: await searchMedia(type, query) });
  } catch (error) {
    console.error('Profile highlights search failed:', error);
    return Response.json({ error: 'AniList y MyAnimeList no están disponibles temporalmente.' }, { status: 503 });
  }
}

