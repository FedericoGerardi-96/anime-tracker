import "server-only";
import { AniListConnectionNotFoundError, getValidAniListAccessToken } from "@/services/anilist-connection";
import { localStatus, remoteStatus } from "@/lib/anilist-sync-policy";
import type { MediaProgressChange, MediaSyncType, ProviderSyncResult } from "@/interfaces/media-sync";

class AniListChangeError extends Error {}
async function request<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => null) as { data?: T; errors?: Array<{ status?: number }> } | null;
  if (response.status === 429 || payload?.errors?.some((error) => error.status === 429)) throw new AniListChangeError("AniList alcanzó el límite de solicitudes. Podés reintentar más tarde.");
  if (response.status === 401 || payload?.errors?.some((error) => error.status === 401)) throw new AniListChangeError("Volvé a conectar AniList desde tu perfil.");
  if (!response.ok || payload?.errors?.length || !payload?.data) throw new AniListChangeError("AniList no pudo aplicar el cambio. Intentá nuevamente más tarde.");
  return payload.data;
}

interface ListMedia {
  id: number; idMal: number; type: string;
  mediaListEntry: { id: number; status: string; progress: number } | null;
}
async function resolveMedia(token: string, malId: number, type: MediaSyncType) {
  if (!Number.isInteger(malId) || malId <= 0 || (type !== "anime" && type !== "manga")) throw new AniListChangeError("La identidad de la serie no es válida.");
  const data = await request<{ Page: { media: ListMedia[] } }>(token,
    `query($id:Int,$type:MediaType){Page(perPage:2){media(idMal:$id,type:$type){id idMal type mediaListEntry{id status progress}}}}`,
    { id: malId, type: type.toUpperCase() });
  const matches = data.Page.media;
  if (matches.length !== 1 || matches[0].idMal !== malId || matches[0].type !== type.toUpperCase() || !Number.isInteger(matches[0].id) || matches[0].id <= 0) {
    throw new AniListChangeError("La serie no tiene una correspondencia única y verificada en AniList.");
  }
  const media = matches[0];
  if (media.mediaListEntry && (!Number.isInteger(media.mediaListEntry.id) || media.mediaListEntry.id <= 0)) throw new AniListChangeError("AniList no devolvió una entrada de biblioteca válida.");
  return media;
}

async function save(token: string, media: ListMedia, status: string, progress: number) {
  const result = await request<{ SaveMediaListEntry: { id: number } }>(token,
    `mutation($entry:Int,$media:Int,$status:MediaListStatus,$progress:Int){SaveMediaListEntry(id:$entry,mediaId:$media,status:$status,progress:$progress){id}}`,
    { entry: media.mediaListEntry?.id, media: media.id, status, progress });
  if (!result.SaveMediaListEntry?.id) throw new AniListChangeError("AniList no confirmó el cambio.");
}

async function connectedChange(userId: string, change: (token: string) => Promise<void>): Promise<ProviderSyncResult> {
  try {
    const token = await getValidAniListAccessToken(userId);
    await change(token);
    return { status: "synced" };
  } catch (error) {
    if (error instanceof AniListConnectionNotFoundError) return { status: "not_connected" };
    return { status: "failed", message: `Se guardó en AniTrack, pero no se pudo actualizar AniList. ${error instanceof Error && (error instanceof AniListChangeError || error.message.startsWith("Volvé a conectar")) ? error.message : "Intentá sincronizar nuevamente más tarde."}` };
  }
}

export async function syncMediaFavoriteWithAniList(userId: string, malId: number, mediaType: MediaSyncType, favorite: boolean): Promise<ProviderSyncResult> {
  return connectedChange(userId, async (token) => {
    const media = await resolveMedia(token, malId, mediaType);
    if (favorite) {
      // Adding to AniTrack must preserve a pre-existing watching/completed entry.
      if (!media.mediaListEntry) await save(token, media, "PLANNING", 0);
    } else if (media.mediaListEntry) {
      // An explicit user removal mirrors MAL's library removal; this is not ToggleFavourite.
      const result = await request<{ DeleteMediaListEntry: { deleted: boolean } }>(token,
        `mutation($entry:Int){DeleteMediaListEntry(id:$entry){deleted}}`, { entry: media.mediaListEntry.id });
      if (typeof result.DeleteMediaListEntry?.deleted !== "boolean") throw new AniListChangeError("AniList no confirmó la eliminación de su lista.");
    }
  });
}

export async function syncMediaProgressWithAniList(userId: string, input: MediaProgressChange): Promise<ProviderSyncResult> {
  return connectedChange(userId, async (token) => {
    const status = remoteStatus(input.status);
    if (!status || !Number.isInteger(input.progress) || input.progress < 0) throw new AniListChangeError("El progreso no es válido para AniList.");
    const media = await resolveMedia(token, input.malId, input.mediaType);
    const entry = media.mediaListEntry;
    if (entry && localStatus(entry.status) === input.status && entry.progress === input.progress) return;
    await save(token, media, entry?.status === "REPEATING" && status === "CURRENT" ? "REPEATING" : status, input.progress);
  });
}
