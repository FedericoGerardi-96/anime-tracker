export type MediaSyncType = "anime" | "manga";
export type MediaSyncStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";
export type ProviderSyncResult = { status: "synced" | "not_connected" } | { status: "failed"; message: string };
export interface MediaProgressChange {
  malId: number;
  mediaType: MediaSyncType;
  status: MediaSyncStatus;
  progress: number;
}
