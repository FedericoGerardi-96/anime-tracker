import { createClient } from "@/lib/supabase/server";
import SidebarClient from "./SidebarClient";
import { IProfile } from "@/types/profile";

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: IProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return <SidebarClient user={user} profile={profile} />;
}
