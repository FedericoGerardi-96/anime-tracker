import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { encryptAniListToken, decryptAniListToken } from "@/lib/anilist-token-crypto";
import type { AniListTokens, AniListUser } from "@/lib/anilist-oauth";

export interface AniListConnectionStatus {
  connected: boolean;
  username?: string;
  needsReconnect?: boolean;
}
export class AniListConnectionNotFoundError extends Error {}

export async function getValidAniListAccessToken(userId: string): Promise<string> {
  const { data, error } = await createSupabaseAdminClient().from("anilist_connections")
    .select("access_token_encrypted,token_expires_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("No se pudo consultar la conexión de AniList.");
  if (!data) throw new AniListConnectionNotFoundError("No hay una cuenta de AniList conectada.");
  if (!(Date.parse(data.token_expires_at) > Date.now())) throw new Error("Volvé a conectar AniList desde tu perfil: la autorización venció.");
  return decryptAniListToken(data.access_token_encrypted);
}

export async function getAniListConnectionStatus(userId: string): Promise<AniListConnectionStatus> {
  try {
    const { data, error } = await createSupabaseAdminClient().from("anilist_connections")
      .select("anilist_username, token_expires_at").eq("user_id", userId).maybeSingle();
    if (error || !data) return { connected: false };
    return { connected: true, username: data.anilist_username, needsReconnect: Date.parse(data.token_expires_at) <= Date.now() };
  } catch { return { connected: false }; }
}

export async function saveAniListConnection(userId: string, viewer: AniListUser, tokens: AniListTokens) {
  const { error } = await createSupabaseAdminClient().from("anilist_connections").upsert({
    user_id: userId, anilist_user_id: viewer.id, anilist_username: viewer.name,
    access_token_encrypted: encryptAniListToken(tokens.access_token),
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error("No se pudo guardar la conexión de AniList");
}

export async function deleteAniListConnection(userId: string) {
  const { error } = await createSupabaseAdminClient().from("anilist_connections").delete().eq("user_id", userId);
  if (error) throw new Error("No se pudo desconectar AniList");
}
