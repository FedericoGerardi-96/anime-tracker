import { getMalAnimeCatalog, getMalMangaCatalog, mapMalAnimeToCatalog, mapMalMangaToCatalog } from "@/lib/myanimelist-service";
import { searchCharacters } from "@/services/anilist-characters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedType = searchParams.get("type");
  const type = requestedType === "manga" || requestedType === "character" ? requestedType : "anime";
  if (query.length < 3) return Response.json({ data: [] });

  try {
    if (type === "character") {
      const result = await searchCharacters(query, 1);
      return Response.json({ data: result.characters.slice(0, 5).map((character) => ({ mal_id: character.id, name: character.name, images: { webp: { small_image_url: character.image } } })) });
    }
    if (type === "manga") {
      const result = await getMalMangaCatalog({ q: query, limit: 5 });
      return Response.json({ data: result.manga.map(mapMalMangaToCatalog) });
    }
    const result = await getMalAnimeCatalog({ q: query, limit: 5 });
    return Response.json({ data: result.anime.map(mapMalAnimeToCatalog) });
  } catch (error) {
    const provider = type === "character" ? "AniList" : "MyAnimeList";
    console.error(`${provider} catalog search failed:`, error);
    return Response.json(
      { error: `La búsqueda de ${provider} no está disponible`, provider },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
