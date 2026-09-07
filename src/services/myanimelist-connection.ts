import "server-only";

import type { MalConnectionStatus, MalConnectionTokenRow, MalCurrentUser, MalOAuthTokenResponse } from "@/interfaces/myanimelist-auth";
import { decryptMalToken, encryptMalToken } from "@/lib/mal-token-crypto";
import { refreshMalTokens } from "@/lib/myanimelist-oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export class MalConnectionNotFoundError extends Error {}

export async function getMalConnectionStatus(userId: string): Promise<MalConnectionStatus> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("mal_connections")
      .select("mal_username, mal_avatar_url, status, last_synced_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return { connected: false };
    return {
      connected: true,
      username: data.mal_username,
      avatarUrl: data.mal_avatar_url ?? undefined,
      status: data.status,
      lastSyncedAt: data.last_synced_at ?? undefined,
    };
  } catch {
    return { connected: false };
  }
}

export async function saveMalConnection(
  userId: string,
  malUser: MalCurrentUser,
  tokens: MalOAuthTokenResponse,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await supabase.from("mal_connections").upsert({
    user_id: userId,
    mal_user_id: malUser.id,
    mal_username: malUser.name,
    mal_avatar_url: malUser.picture ?? null,
    access_token_encrypted: encryptMalToken(tokens.access_token),
    refresh_token_encrypted: encryptMalToken(tokens.refresh_token),
    token_expires_at: expiresAt,
    status: "active",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) throw new Error(`No se pudo guardar la conexión con MyAnimeList: ${error.message}`);
}

export async function deleteMalConnection(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("mal_connections").delete().eq("user_id", userId);
  if (error) throw new Error(`No se pudo desconectar MyAnimeList: ${error.message}`);
}

export async function getValidMalAccessToken(userId: string, forceRefresh = false): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("mal_connections")
    .select("access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("user_id", userId)
    .single<MalConnectionTokenRow>();

  if (error || !data) throw new MalConnectionNotFoundError("El usuario no conectó una cuenta de MyAnimeList");

  const refreshMarginMs = 5 * 60 * 1000;
  if (!forceRefresh && new Date(data.token_expires_at).getTime() > Date.now() + refreshMarginMs) {
    return decryptMalToken(data.access_token_encrypted);
  }

  try {
    const tokens = await refreshMalTokens(decryptMalToken(data.refresh_token_encrypted));
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const { error: updateError } = await supabase.from("mal_connections").update({
      access_token_encrypted: encryptMalToken(tokens.access_token),
      refresh_token_encrypted: encryptMalToken(tokens.refresh_token),
      token_expires_at: expiresAt,
      status: "active",
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    if (updateError) throw updateError;
    return tokens.access_token;
  } catch (refreshError) {
    await supabase.from("mal_connections").update({ status: "reconnect_required" }).eq("user_id", userId);
    throw new Error("MyAnimeList requiere una nueva autorización", { cause: refreshError });
  }
}
