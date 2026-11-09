import { notFound } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import RelationshipButton from '@/components/friends/RelationshipButton';
import { getProfileAvatar } from '@/lib/profile-avatar';
import { getSocialProfile } from '@/services/social';
import { getAuthenticatedUser } from '@/services/supabase';
import { getProfileImages } from '@/services/profile-images';

export default async function SocialProfilePage({ params, searchParams }: PageProps<'/users/[username]'>) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) notFound();
  const [profile, user] = await Promise.all([getSocialProfile(username), getAuthenticatedUser()]);
  if (!profile) notFound();
  const own = profile.relationship === 'self' && user?.id === profile.id;
  const images = await getProfileImages(profile.id);

  return (
    <ProfileView
      profile={{ id: profile.id, name: profile.full_name?.trim() || profile.username,
        username: profile.username, bio: profile.bio,
        avatar: getProfileAvatar(images.avatar, profile.avatar), cover: images.cover,
        joinedAt: own ? user.created_at : undefined }}
      own={own}
      query={query}
      privacy={profile}
      relationship={user && !own ? <RelationshipButton profile={profile} /> : undefined}
    />
  );
}
