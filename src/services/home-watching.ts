import "server-only";
import { cache } from "react";
import { randomInt } from "node:crypto";
import { getAuthenticatedUser, getSupabaseServer } from "@/services/supabase";
import { readAllPages } from "@/lib/read-all-pages";
import { selectRandomWatching } from "@/lib/home-watching-selection";

export const getHomeWatching = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) return { signedIn: false as const, items: [], error: false };
  const supabase = await getSupabaseServer();
  try {
    const data = await readAllPages((from, to) => supabase
      .from("user_media_progress")
      .select("id, current_episode, media!inner(mal_id, title, image, type, total_units)")
      .eq("user_id", user.id)
      .eq("status", "watching")
      .eq("media.type", "anime")
      .order("id")
      .range(from, to));
    const candidates = data.flatMap((entry) => {
      const media = Array.isArray(entry.media) ? entry.media[0] : entry.media;
      if (!media || !Number.isSafeInteger(media.mal_id) || media.mal_id <= 0 || typeof media.title !== "string") return [];
      return [{ id: entry.id, episode: Math.max(0, entry.current_episode ?? 0), media }];
    });
    return { signedIn: true as const, items: selectRandomWatching(candidates, 4, randomInt), error: false };
  } catch {
    return { signedIn: true as const, items: [], error: true };
  }
});
