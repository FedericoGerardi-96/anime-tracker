import "server-only";
import { cache } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getSupabaseServer() {
  return await createServerClient();
}

// Request-scoped memoization during Server Component rendering, never a shared session cache.
export const getAuthenticatedUser = cache(async () => {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
