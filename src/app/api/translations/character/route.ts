import { createClient } from '@/lib/supabase/server';
import { getCachedCharacterTranslation, saveCharacterTranslation } from '@/services/character-translation';

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('anilistId'));
  if (!Number.isInteger(id)) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  try { return Response.json({ text: await getCachedCharacterTranslation(id) }); }
  catch { return Response.json({ text: null }); }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as { anilistId?: number; sourceHash?: string; translatedText?: string } | null;
  if (!body || !Number.isInteger(body.anilistId) || typeof body.sourceHash !== 'string' || typeof body.translatedText !== 'string') return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  try { await saveCharacterTranslation(body.anilistId!, body.sourceHash, body.translatedText); return Response.json({ success: true }); }
  catch { return Response.json({ error: 'No se pudo guardar la traducción' }, { status: 500 }); }
}
