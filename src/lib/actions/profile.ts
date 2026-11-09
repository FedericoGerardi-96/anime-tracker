"use server"

import { getAuthenticatedUser } from "@/services/supabase"
import { updateProfileShowHContent } from "@/services/profile"
import { revalidatePath } from "next/cache"

export async function updateShowHContent(value: boolean) {
  if (typeof value !== "boolean") return { error: "Preferencia inválida" }

  const user = await getAuthenticatedUser()

  if (!user) return { error: "Tu sesión venció" }

  const result = await updateProfileShowHContent(user.id, value)

  if (result.error) return { error: result.error }

  revalidatePath("/settings/adult-content")
  revalidatePath("/")
  return { success: true }
}
