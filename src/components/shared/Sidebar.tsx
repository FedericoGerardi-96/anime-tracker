import { getAuthenticatedUser } from "@/services/supabase";
import { getUserProfile } from "@/services/profile";
import SidebarClient from "./SidebarClient";
import { IProfile } from "@/types/profile";

export default async function Sidebar() {
  const user = await getAuthenticatedUser();

  let profile: IProfile | null = null;
  if (user) {
    profile = await getUserProfile(user.id);
  }

  return <SidebarClient user={user} profile={profile} />;
}
