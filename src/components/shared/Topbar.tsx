import { getAuthenticatedUser } from "@/services/supabase";
import { getUserProfile } from "@/services/profile";
import TopbarClient from "./TopbarClient";
import { getCatalogProvider } from "@/services/catalog-provider";
import { IProfile } from "@/types/profile";
import { getProfileImages } from "@/services/profile-images";

export default async function Topbar() {
  const [user, provider] = await Promise.all([getAuthenticatedUser(), getCatalogProvider()]);

  let profile: IProfile | null = null;
  if (user) {
    const [stored, images] = await Promise.all([getUserProfile(user.id), getProfileImages(user.id)]);
    profile = stored && images.avatar ? { ...stored, avatar: images.avatar } : stored;
  }

  return <TopbarClient key={provider} user={user} profile={profile} />;
}
