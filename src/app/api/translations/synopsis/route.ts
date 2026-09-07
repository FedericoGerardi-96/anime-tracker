import { getMalAnimeById, getMalMangaById } from "@/lib/myanimelist-service";
import { createClient } from "@/lib/supabase/server";
import { getCachedSpanishSynopsis, saveBrowserSynopsisTranslation, synopsisSourceHash } from "@/services/catalog-translation";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const malId = Number(params.get("malId"));
  const rawType = params.get("mediaType");
  const mediaType = rawType === "anime" || rawType === "manga" ? rawType : null;
  if (!Number.isInteger(malId) || !mediaType) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  try {
    const media = mediaType === "anime" ? await getMalAnimeById(malId) : await getMalMangaById(malId);
    const description = await getCachedSpanishSynopsis({ malId, mediaType, description: media.synopsis });
    return Response.json({ description: description !== media.synopsis?.trim() ? description : null });
  } catch {
    return Response.json({ description: null });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null) as { malId?: number; mediaType?: "anime" | "manga"; sourceHash?: string; translatedText?: string } | null;
  if (!body || !Number.isInteger(body.malId) || !["anime", "manga"].includes(body.mediaType ?? "") || typeof body.translatedText !== "string") return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  try {
    if (body.mediaType === "anime") {
      const media = await getMalAnimeById(body.malId!);
      if (!media.synopsis || synopsisSourceHash(media.synopsis.trim()) !== body.sourceHash) return Response.json({ error: "La sinopsis original cambió" }, { status: 409 });
      await saveBrowserSynopsisTranslation({ malId: body.malId!, mediaType: "anime", title: media.title_english || media.title, image: media.images.webp.large_image_url || media.images.jpg.large_image_url, description: media.synopsis, season: media.season, tags: media.genres.map((genre) => genre.name), score: media.score }, body.translatedText);
    } else {
      const media = await getMalMangaById(body.malId!);
      if (!media.synopsis || synopsisSourceHash(media.synopsis.trim()) !== body.sourceHash) return Response.json({ error: "La sinopsis original cambió" }, { status: 409 });
      await saveBrowserSynopsisTranslation({ malId: body.malId!, mediaType: "manga", title: media.title_english || media.title, image: media.images.webp.large_image_url || media.images.jpg.large_image_url, description: media.synopsis, season: media.type, tags: media.genres.map((genre) => genre.name), score: media.score }, body.translatedText);
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("No se pudo guardar la traducción del navegador:", error);
    return Response.json({ error: "No se pudo guardar la traducción" }, { status: 500 });
  }
}
