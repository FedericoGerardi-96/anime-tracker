import "server-only";
import { syncMediaFavoriteWithMal } from "@/services/myanimelist-list";
import { getValidMalAccessToken, MalConnectionNotFoundError } from "@/services/myanimelist-connection";
import { setMalAnimeProgress, setMalMangaProgress } from "@/services/myanimelist-library";
import { syncMediaFavoriteWithAniList, syncMediaProgressWithAniList } from "@/services/anilist-list";
import type { MediaProgressChange, MediaSyncType, ProviderSyncResult } from "@/interfaces/media-sync";

async function syncProgressWithMal(userId: string, input: MediaProgressChange): Promise<ProviderSyncResult> {
  try {
    const update = async (forceRefresh = false) => {
      const token = await getValidMalAccessToken(userId, forceRefresh);
      if (input.mediaType === "anime") await setMalAnimeProgress(token, input.malId, input.status, input.progress, true);
      else await setMalMangaProgress(token, input.malId, input.status === "watching" ? "reading" : input.status === "plan_to_watch" ? "plan_to_read" : input.status, input.progress, true);
    };
    try { await update(); }
    catch (error) { if (error instanceof Error && "status" in error && error.status === 401) await update(true); else throw error; }
    return { status: "synced" };
  } catch (error) {
    if (error instanceof MalConnectionNotFoundError) return { status: "not_connected" };
    return { status: "failed", message: "Se guardó en AniTrack, pero no se pudo actualizar MyAnimeList." };
  }
}

async function both(mal: () => Promise<ProviderSyncResult>, anilist: () => Promise<ProviderSyncResult>) {
  // Each provider checks its own connection. A rejection must never prevent the other update.
  const results = await Promise.allSettled([Promise.resolve().then(mal), Promise.resolve().then(anilist)]);
  const messages = results.flatMap((result, index) => result.status === "rejected"
    ? [`Se guardó en AniTrack, pero no se pudo actualizar ${index === 0 ? "MyAnimeList" : "AniList"}.`]
    : result.value.status === "failed" ? [result.value.message] : []);
  return { warning: messages.length ? messages.join(" ") : undefined };
}

export async function syncMediaFavoriteWithProviders(userId: string, malId: number, type: MediaSyncType, favorite: boolean) {
  return both(() => syncMediaFavoriteWithMal(userId, malId, type, favorite), () => syncMediaFavoriteWithAniList(userId, malId, type, favorite));
}
export async function syncMediaProgressWithProviders(userId: string, input: MediaProgressChange) {
  return both(() => syncProgressWithMal(userId, input), () => syncMediaProgressWithAniList(userId, input));
}
