import type { Metadata } from 'next';
import SocialProfileSettings from '@/components/profile/SocialProfileSettings';
import { SettingsSection } from '@/components/settings/SettingsFrame';
import { requireSettingsUser } from '@/lib/settings-session';
import { getUserProfile } from '@/services/profile';
import { getProfileImages } from '@/services/profile-images';
import { getProfileAvatar, getProfileInitials } from '@/lib/profile-avatar';
import ProfileImagesSettings from '@/components/profile/ProfileImagesSettings';

export const metadata: Metadata = { title: 'Perfil y biografía · Ajustes' };

export default async function ProfileSettingsPage() {
  const user = await requireSettingsUser();
  const [profile, images] = await Promise.all([getUserProfile(user.id), getProfileImages(user.id)]);
  const accountName = user.user_metadata?.full_name;
  const name = profile?.full_name?.trim() || (typeof accountName === 'string' && accountName.trim()) || profile?.username || 'Usuario';

  return (
    <SettingsSection active="profile" description="Editá tu foto, portada, biografía y opciones de amistad.">
      <ProfileImagesSettings {...images} initials={getProfileInitials(name)}
        fallbackAvatar={getProfileAvatar(profile?.avatar, user.user_metadata?.avatar_url)} />
      {profile ? (
        <SocialProfileSettings
          username={profile.username ?? ''}
          bio={profile.bio ?? ''}
          discoverable={profile.discoverable ?? true}
          allowFriendRequests={profile.allow_friend_requests ?? true}
        />
      ) : <p role="alert">No pudimos cargar tu perfil. Recargá la página para volver a intentarlo.</p>}
    </SettingsSection>
  );
}
