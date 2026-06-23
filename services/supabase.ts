import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getSupabaseServer() {
  return await createServerClient();
}

export async function getAuthenticatedUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
