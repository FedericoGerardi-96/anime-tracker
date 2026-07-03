"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { IUserMediaMetadata } from "@/types/favorites"

/**
 * Fetches user-specific metadata for a given media item.
 */
export async function getUserMediaMetadata(mediaId: string): Promise<IUserMediaMetadata | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from("user_media_metadata")
    .select("id, user_id, media_id, custom_description, watch_link, custom_tags")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching user media metadata:", error)
    return null
  }

  return data as IUserMediaMetadata | null
}

/**
 * Creates or updates user-specific metadata for a media item (upsert on user_id + media_id).
 */
export async function upsertUserMediaMetadata(metadata: {
  media_id: string
  custom_description?: string | null
  watch_link?: string | null
  custom_tags?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("user_media_metadata")
    .upsert(
      {
        user_id: user.id,
        media_id: metadata.media_id,
        custom_description: metadata.custom_description ?? null,
        watch_link: metadata.watch_link ?? null,
        custom_tags: metadata.custom_tags ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_id" }
    )

  if (error) {
    console.error("Error upserting user media metadata:", error)
    return { error: error.message }
  }

  revalidatePath("/favorites")
  revalidatePath("/lists")
  revalidatePath("/profile")

  return { success: true }
}
