export type SyncMediaType = "anime" | "manga";
export type SyncProvider = "anilist" | "myanimelist";
export interface SyncProgress { status: string; current_episode: number; updated_at: string | null }
export interface RemoteListEntry {
  status: string; progress: number; updatedAt: number;
  media: {
    id: number; idMal: number | null; type: string;
    title: { romaji: string; english: string | null };
    coverImage: { large: string }; episodes: number | null; chapters: number | null;
    metadata?: { score: number; genres: string[]; format: string | null; status: string | null; season: string | null; year: number | null; day: string | null };
  };
}
export interface SyncState {
  accountId: number;
  types: SyncMediaType[];
  typeIndex: number;
  phase: "fetch" | "import" | "prepare" | "exports";
  prepareOffset?: number;
  planVersion?: number;
  importQueue?: RemoteListEntry[];
  matchedRemoteIds?: number[];
  importLocalIds?: Record<number, string>;
  unchanged?: number;
  page: number;
  remote: RemoteListEntry[];
  cursor: number;
  exportOffset: number;
  exportQueue?: Array<{ malId: number; localId: string }>;
  pendingExport?: { malId: number; mediaId: number; remote: { status: string; progress: number; updatedAt: number } | null };
  imported: number; exported: number; updated: number; skipped: number;
  warnings: string[];
}
export interface AniListSyncJob {
  id: string; user_id: string; status: "queued" | "running" | "complete" | "error" | "cancelled";
  provider?: SyncProvider;
  cancel_requested?: boolean;
  state: SyncState; message: string; next_run_at: string; updated_at: string; attempts: number;
}
export interface PublicAniListSyncJob {
  provider: SyncProvider;
  cancelRequested: boolean;
  current: number;
  total: number;
  unchanged: number;
  id: string; status: AniListSyncJob["status"]; message: string;
  imported: number; exported: number; updated: number; skipped: number;
  warnings: string[]; updatedAt: string;
  phase: SyncState["phase"];
  nextRunAt: string;
  attempts: number;
}
