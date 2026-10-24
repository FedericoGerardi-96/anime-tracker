import { timingSafeEqual } from "node:crypto";
import { processAniListSyncStep } from "@/services/anilist-sync";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const expected = process.env.ANILIST_SYNC_WORKER_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !actual || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  try { return Response.json(await processAniListSyncStep(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "No se pudo procesar la cola. Revisá las migraciones y Supabase." }, { status: 503 }); }
}
