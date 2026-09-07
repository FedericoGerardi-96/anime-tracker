import { getSupabaseServer } from "@/services/supabase";
import { IProfile } from "@/types/profile";

/**
 * Fetches the user profile from the database.
 */
export async function getUserProfile(userId: string): Promise<IProfile | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // PGRST116 is postgrest code for no rows returned
      console.error("Error fetching profile:", error);
    }
    return null;
  }

  return data as IProfile;
}

/**
 * Updates the 'show_h_content' flag in the user's profile.
 */
export async function updateProfileShowHContent(userId: string, value: boolean) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ show_h_content: value })
    .eq("id", userId);

  if (error) {
    console.error("Error updating profile show_h_content:", error);
    return { error: error.message };
  }

  return { success: true };
}
