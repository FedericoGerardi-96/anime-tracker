import type { MalAnimeNode, MalMangaNode } from "@/interfaces/myanimelist";

export type LibraryMediaType = "anime" | "manga";
export interface LibrarySyncSelection { anime: boolean; manga: boolean }

export interface MalAnimeListStatus {
  status: "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";
  score: number;
  num_episodes_watched: number;
  updated_at: string;
}

export interface MalAnimeListEntry {
  node: MalAnimeNode;
  list_status: MalAnimeListStatus;
}

export interface MalMangaListStatus {
  status: "reading" | "completed" | "on_hold" | "dropped" | "plan_to_read";
  score: number;
  num_volumes_read: number;
  num_chapters_read: number;
  updated_at: string;
}

export interface MalMangaListEntry {
  node: MalMangaNode;
  list_status: MalMangaListStatus;
}

export interface LibrarySyncProgress {
  type: "progress" | "complete" | "error";
  phase: "loading" | "importing" | "exporting" | "reconciling" | "complete" | "error";
  message: string;
  current?: number;
  total?: number;
  imported: number;
  exported: number;
  reconciled: number;
  details?: LibrarySyncDetail[];
}

export interface LibrarySyncDetail {
  action: "imported" | "exported" | "updated_in_anitrack" | "updated_in_mal";
  title: string;
  mediaType: LibraryMediaType;
}

export interface LocalMediaForSync {
    id: string;
    mal_id: number;
    title: string;
    type: string;
    image: string;
    season?: string | null;
    year?: number | null;
    genres?: string[] | null;
    tags?: string[] | null;
    format?: string | null;
    status?: string | null;
    day?: string | null;
    total_units?: number | null;
    score?: number | null;
}

export interface LocalFavoriteForSync {
  id: string;
  media: LocalMediaForSync | LocalMediaForSync[];
}

export interface LocalProgressForSync {
  media_id: string;
  status: string | null;
  current_episode: number | null;
  updated_at: string | null;
}
