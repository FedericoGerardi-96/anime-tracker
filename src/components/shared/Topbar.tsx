import { getAuthenticatedUser } from "@/services/supabase";
import { getUserProfile } from "@/services/profile";
import TopbarClient from "./TopbarClient";
import { IProfile } from "@/types/profile";

export default async function Topbar() {
  const user = await getAuthenticatedUser();

  let profile: IProfile | null = null;
  if (user) {
    profile = await getUserProfile(user.id);
  }

  return <TopbarClient user={user} profile={profile} />;
}
