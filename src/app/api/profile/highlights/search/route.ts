import { getAniListCatalog } from '@/services/anilist-catalog';
import { searchCharacters } from '@/services/anilist-characters';
import type { ProfileHighlightCategory } from '@/types/profile-highlights';

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
        subtitle: item.nativeName || null, image_url: item.image, position: 0,
      })) });
    }

    const result = await getAniListCatalog(type, { q: query, perPage: 8 });
    return Response.json({ data: result.items.map((item) => ({
      category: type, external_id: item.id, title: item.title,
      subtitle: [item.format, item.year || null].filter(Boolean).join(' · '), image_url: item.image, position: 0,
    })) });
  } catch (error) {
    console.error('Profile highlights search failed:', error);
    return Response.json({ error: 'AniList no está disponible temporalmente.' }, { status: 503 });
  }
}

