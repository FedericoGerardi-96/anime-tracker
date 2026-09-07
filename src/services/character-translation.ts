import 'server-only';
import { createHash } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeTranslatableText } from '@/lib/plain-text';

const hash = (value: string) => createHash('sha256').update(normalizeTranslatableText(value), 'utf8').digest('hex');
const legacyHash = (value: string) => createHash('sha256').update(value.trim(), 'utf8').digest('hex');

async function character(anilistId: number) {
  const { data, error } = await createSupabaseAdminClient().from('characters').select('id, description').eq('anilist_id', anilistId).maybeSingle();
  if (error) throw error;
  return data as { id: string; description: string | null } | null;
}

export async function getCachedCharacterTranslation(anilistId: number) {
  const source = await character(anilistId);
  if (!source?.description) return null;
  const { data, error } = await createSupabaseAdminClient().from('character_translations').select('description, source_hash').eq('character_id', source.id).eq('language_code', 'es').maybeSingle();
  if (error) throw error;
  return data?.source_hash === hash(source.description) || data?.source_hash === legacyHash(source.description) ? normalizeTranslatableText(data.description as string) : null;
}

export async function saveCharacterTranslation(anilistId: number, sourceHash: string, translatedText: string) {
  const source = await character(anilistId);
  if (!source?.description || hash(source.description) !== sourceHash) throw new Error('La biografía original cambió');
  const translated = normalizeTranslatableText(translatedText);
  if (!translated || translated.length > 30_000) throw new Error('Traducción inválida');
  const { error } = await createSupabaseAdminClient().from('character_translations').upsert({ character_id: source.id, language_code: 'es', description: translated, source_hash: sourceHash, translation_provider: 'chrome-translator', updated_at: new Date().toISOString() }, { onConflict: 'character_id,language_code' });
  if (error) throw error;
}
