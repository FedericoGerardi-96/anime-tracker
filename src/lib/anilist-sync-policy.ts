import type { SyncProgress } from "@/interfaces/anilist-sync";

const TO_LOCAL: Record<string, string> = { CURRENT: "watching", REPEATING: "watching", PLANNING: "plan_to_watch", COMPLETED: "completed", PAUSED: "on_hold", DROPPED: "dropped" };
const TO_REMOTE: Record<string, string> = { watching: "CURRENT", reading: "CURRENT", plan_to_watch: "PLANNING", plan_to_read: "PLANNING", completed: "COMPLETED", on_hold: "PAUSED", dropped: "DROPPED" };
export function localStatus(status: string) { return TO_LOCAL[status]; }
export function remoteStatus(status: string) { return TO_REMOTE[status]; }

export function reconcileAniListProgress(local: SyncProgress | null, remote: { status: string; progress: number; updatedAt: number } | null): "local" | "remote" | "same" | "unsupported" {
  if (!remote) return local && !remoteStatus(local.status) ? "unsupported" : "local";
  const status = localStatus(remote.status);
  if (!status) return "unsupported";
  if (!local) return "remote";
  if (!remoteStatus(local.status)) return "unsupported";
  const normalizedLocal = localStatus(remoteStatus(local.status));
  if (normalizedLocal === status && local.current_episode === remote.progress) return "same";
  if (normalizedLocal === "completed" && status === "completed" && remote.progress > local.current_episode) return "remote";
  // Don't replace actual viewing progress with an automatically created empty plan.
  const localEmpty = normalizedLocal === "plan_to_watch" && local.current_episode === 0;
  const remoteEmpty = status === "plan_to_watch" && remote.progress === 0;
  if (localEmpty && !remoteEmpty) return "remote";
  if (remoteEmpty && !localEmpty) return "local";
  // Ties and missing dates favor the remote record, avoiding speculative writes.
  return Date.parse(local.updated_at ?? "") > remote.updatedAt * 1000 ? "local" : "remote";
}
