"use server"

import { getAuthenticatedUser } from "@/services/supabase"
import { updateProfileShowHContent } from "@/services/profile"
import { revalidatePath } from "next/cache"

export async function updateShowHContent(value: boolean) {
  const user = await getAuthenticatedUser()

  if (!user) return { error: "Not authenticated" }

  const result = await updateProfileShowHContent(user.id, value)

  if (result.error) return { error: result.error }

  revalidatePath("/profile")
  revalidatePath("/")
  return { success: true }
}
