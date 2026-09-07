import "server-only";

import {
  getValidMalAccessToken,
  MalConnectionNotFoundError,
} from "@/services/myanimelist-connection";

const MAL_API_BASE = "https://api.myanimelist.net/v2";

export type MalFavoriteSyncResult =
  | { status: "synced" }
  | { status: "not_connected" }
  | { status: "failed"; message: string };

async function updateMalFavorite(
  mediaId: number,
  mediaType: "anime" | "manga",
  isFavorite: boolean,
  accessToken: string,
): Promise<Response> {
  const url = `${MAL_API_BASE}/${mediaType}/${mediaId}/my_list_status`;
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };

  if (!isFavorite) {
    return fetch(url, { method: "DELETE", headers, cache: "no-store" });
  }

  const membershipResponse = await fetch(
    `${MAL_API_BASE}/${mediaType}/${mediaId}?fields=my_list_status`,
    { headers, cache: "no-store" },
  );
  if (!membershipResponse.ok) return membershipResponse;

  const membership = await membershipResponse.json() as { my_list_status?: unknown };
  // A favorite in AniTrack must not downgrade an existing watching/completed
  // entry in MAL to plan_to_watch.
  if (membership.my_list_status) return membershipResponse;

  return fetch(url, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ status: mediaType === "anime" ? "plan_to_watch" : "plan_to_read" }),
    cache: "no-store",
  });
}

async function performMalFavoriteUpdate(userId: string, mediaId: number, mediaType: "anime" | "manga", isFavorite: boolean) {
  const accessToken = await getValidMalAccessToken(userId);
  let response = await updateMalFavorite(mediaId, mediaType, isFavorite, accessToken);

  if (response.status === 401) {
    const refreshedAccessToken = await getValidMalAccessToken(userId, true);
    response = await updateMalFavorite(mediaId, mediaType, isFavorite, refreshedAccessToken);
  }

  // DELETE is idempotent for AniTrack: an absent MAL entry is already the
  // desired final state, regardless of whether MAL reports 200 or 404.
  if (!isFavorite && response.status === 404) return;
  if (!response.ok) throw new Error(`MyAnimeList respondió ${response.status}`);
}

export async function syncAnimeFavoriteWithMal(
  userId: string,
  animeId: number,
  isFavorite: boolean,
): Promise<MalFavoriteSyncResult> {
  try {
    await performMalFavoriteUpdate(userId, animeId, "anime", isFavorite);
    return { status: "synced" };
  } catch (error) {
    if (error instanceof MalConnectionNotFoundError) return { status: "not_connected" };
    console.error("No se pudo sincronizar el favorito con MyAnimeList:", error);
    return {
      status: "failed",
      message: "Se guardó en AniTrack, pero no se pudo actualizar MyAnimeList.",
    };
  }
}

export async function syncMediaFavoriteWithMal(
  userId: string,
  mediaId: number,
  mediaType: "anime" | "manga",
  isFavorite: boolean,
): Promise<MalFavoriteSyncResult> {
  try {
    await performMalFavoriteUpdate(userId, mediaId, mediaType, isFavorite);
    return { status: "synced" };
  } catch (error) {
    if (error instanceof MalConnectionNotFoundError) return { status: "not_connected" };
    console.error(`No se pudo sincronizar el ${mediaType} con MyAnimeList:`, error);
    return {
      status: "failed",
      message: "Se guardó en AniTrack, pero no se pudo actualizar MyAnimeList.",
    };
  }
}
