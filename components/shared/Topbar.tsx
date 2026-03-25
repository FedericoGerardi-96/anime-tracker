import { createClient } from "@/lib/supabase/server";
import TopbarClient from "./TopbarClient";
import { IProfile } from "@/types/profile";

export default async function Topbar() {
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

  return <TopbarClient user={user} profile={profile} />;
}
