import { getCatalogProvider } from '@/services/catalog-provider';
import { getAniListCatalog } from '@/services/anilist-catalog';
import { getMalAnimeCatalog, getMalMangaCatalog, mapMalAnimeToCatalog, mapMalMangaToCatalog } from "@/lib/myanimelist-service";
import { searchCharacters } from "@/services/anilist-characters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedType = searchParams.get("type");
  const type = requestedType === "manga" || requestedType === "character" ? requestedType : "anime";
  if (query.length < 3) return Response.json({ data: [] });

  const selectedProvider = await getCatalogProvider();
  try {
    if (type === "character") {
      const result = await searchCharacters(query, 1);
      return Response.json({ data: result.characters.slice(0, 5).map((character) => ({ mal_id: character.id, provider: character.provider ?? 'anilist', name: character.name, images: { webp: { small_image_url: character.image } } })) });
    }
    if (selectedProvider === 'anilist') {
      const result = await getAniListCatalog(type, { q: query, perPage: 5 });
      return Response.json({ data: result.items.map(item => ({ mal_id: item.id, title: item.title, images: { webp: { small_image_url: item.image } } })) });
    }
    if (type === "manga") {
      const result = await getMalMangaCatalog({ q: query, limit: 5 });
      return Response.json({ data: result.manga.map(mapMalMangaToCatalog) });
    }
    const result = await getMalAnimeCatalog({ q: query, limit: 5 });
    return Response.json({ data: result.anime.map(mapMalAnimeToCatalog) });
  } catch (error) {
    const provider = type === "character" ? "personajes" : selectedProvider;
    console.error(`${provider} catalog search failed:`, error);
    return Response.json(
      { error: `La búsqueda de ${provider} no está disponible`, provider },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
