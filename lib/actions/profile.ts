"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateShowHContent(value: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("profiles")
    .update({ show_h_content: value })
    .eq("id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/profile")
  revalidatePath("/")
  return { success: true }
}
