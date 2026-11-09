import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileView from '@/components/profile/ProfileView';
import { getProfileAvatar } from '@/lib/profile-avatar';
import { getAuthenticatedUser, getSupabaseServer } from '@/services/supabase';
import { getProfileImages } from '@/services/profile-images';

export const metadata: Metadata = {
  title: 'Mi perfil',
  description: 'Tu top de anime, manga y personajes, tus listas públicas y lo que estás viendo.',
};

export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const [user, query] = await Promise.all([getAuthenticatedUser(), searchParams]);
  if (!user) redirect('/login');
  const db = await getSupabaseServer();
  const [{ data, error }, images] = await Promise.all([
    db.from('profiles').select('full_name,username,avatar,bio').eq('id', user.id).maybeSingle(),
    getProfileImages(user.id),
  ]);
  if (error) throw new Error('No pudimos cargar tu perfil.');

  const accountName = user.user_metadata?.full_name;
  const name = data?.full_name?.trim() || (typeof accountName === 'string' && accountName.trim()) || data?.username || 'Usuario';
  return (
    <ProfileView
      profile={{ id: user.id, name, username: data?.username, bio: data?.bio,
        avatar: getProfileAvatar(images.avatar, data?.avatar, user.user_metadata?.avatar_url),
        cover: images.cover, joinedAt: user.created_at }}
      own
      query={query}
    />
  );
}
