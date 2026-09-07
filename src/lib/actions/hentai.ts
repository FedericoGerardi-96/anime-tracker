"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface HentaiEntry {
  id: string;
  user_id: string;
  title: string;
  image: string;
  type: "anime" | "doujin";
  description: string;
  created_at: string;
}

export async function createHentaiEntry(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const title = formData.get("title") as string;
  const type = formData.get("type") as "anime" | "doujin";
  const image = formData.get("image") as string;
  const description = formData.get("description") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  const { error } = await supabase.from("hentai").insert({
    user_id: user.id,
    title,
    type,
    image,
    description,
  });

  if (error) {
    console.error("Error creating entry:", error);
    return { error: error.message };
  }

  revalidatePath("/hentai");
  return { success: true };
}

export async function getHentaiEntries(page: number = 1, pageSize: number = 12, query?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], count: 0, error: "Unauthenticated" };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from("hentai")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  const { data, error, count } = await dbQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching entries:", error);
  }

  return { 
    data: (data || []) as HentaiEntry[], 
    count: count || 0, 
    error: error?.message 
  };
}

export async function deleteHentaiEntry(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthenticated" };
  }

  const { error } = await supabase
    .from("hentai")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting entry:", error);
    return { error: error.message };
  }

  revalidatePath("/hentai");
  return { success: true };
}
