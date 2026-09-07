import "server-only";
import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTranslatableText } from '@/lib/plain-text';

export type TranslatableMediaType = "anime" | "manga";
export interface TranslationMediaData { malId: number; mediaType: TranslatableMediaType; title: string; image: string; description: string | null; season?: string | null; tags?: string[]; score?: number | null }
export function synopsisSourceHash(value: string) { return createHash("sha256").update(normalizeTranslatableText(value), "utf8").digest("hex") }
function legacySourceHash(value: string) { return createHash("sha256").update(value.trim(), "utf8").digest("hex") }

async function findMediaId(malId: number, mediaType: TranslatableMediaType) {
  const { data, error } = await createSupabaseAdminClient().from("media").select("id").eq("mal_id", malId).eq("type", mediaType).maybeSingle();
  if (error) throw error;
  return data?.id as string | undefined;
}
async function ensureMedia(input: TranslationMediaData) {
  const existingId = await findMediaId(input.malId, input.mediaType);
  if (existingId) return existingId;
  const { data, error } = await createSupabaseAdminClient().from("media").insert({ mal_id: input.malId, type: input.mediaType, title: input.title, image: input.image, description: input.description, season: input.season ?? null, tags: input.tags ?? [], score: input.score ?? 0 }).select("id").single();
  if (!error) return data.id as string;
  const racedId = await findMediaId(input.malId, input.mediaType);
  if (racedId) return racedId;
  throw error;
}

export async function getCachedSpanishSynopsis(input: Pick<TranslationMediaData, "malId" | "mediaType" | "description">) {
  const original = input.description ? normalizeTranslatableText(input.description) : '';
  if (!original) return input.description;
  try {
    const mediaId = await findMediaId(input.malId, input.mediaType);
    if (!mediaId) return original;
    const { data, error } = await createSupabaseAdminClient().from("media_translations").select("description, source_hash").eq("media_id", mediaId).eq("language_code", "es").maybeSingle();
    if (error) throw error;
    const hashMatches = data?.source_hash === synopsisSourceHash(original) || data?.source_hash === legacySourceHash(input.description ?? '');
    return hashMatches && data?.description ? normalizeTranslatableText(data.description as string) : original;
  } catch (error) {
    console.error(`No se pudo leer la traducción de ${input.mediaType} ${input.malId}:`, error);
    return original;
  }
}

export async function saveBrowserSynopsisTranslation(input: TranslationMediaData, translatedText: string) {
  const original = input.description ? normalizeTranslatableText(input.description) : '';
  const translated = normalizeTranslatableText(translatedText);
  if (!original || !translated || translated.length > 30_000) throw new Error("Traducción inválida");
  if (translated.length < original.length * 0.2 || translated.length > original.length * 3) throw new Error("Longitud sospechosa");
  const mediaId = await ensureMedia(input);
  const admin = createSupabaseAdminClient();
  const hash = synopsisSourceHash(original);
  const { data: existing } = await admin.from("media_translations").select("description, source_hash").eq("media_id", mediaId).eq("language_code", "es").maybeSingle();
  if (existing?.source_hash === hash && existing.description === translated) return;
  const { error } = await admin.from("media_translations").upsert({ media_id: mediaId, language_code: "es", description: translated, source_hash: hash, translation_provider: "chrome-translator", updated_at: new Date().toISOString() }, { onConflict: "media_id,language_code" });
  if (error) throw error;
}
