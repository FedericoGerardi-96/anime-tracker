'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProfilePrivacy, VisibilityLevel } from '@/types/social';

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshSocialPages(username?: string) {
  revalidatePath('/friends');
  revalidatePath('/profile');
  if (username) revalidatePath(`/users/${username}`);
}

export async function sendFriendRequest(targetUserId: string) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: 'No autorizado' };
  const { error } = await supabase.rpc('send_friend_request', { target_user_id: targetUserId });
  if (error) return { error: error.message };
  refreshSocialPages();
  return { success: true };
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: 'No autorizado' };
  const { error } = await supabase.rpc('respond_friend_request', { request_id: requestId, accept_request: accept });
  if (error) return { error: error.message };
  refreshSocialPages();
  return { success: true };
}

export async function removeFriendship(friendshipId: string) {
  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: 'No autorizado' };
  const { error } = await supabase.rpc('remove_friendship', { friendship_id: friendshipId });
  if (error) return { error: error.message };
  refreshSocialPages();
  return { success: true };
}

export async function updateProfilePrivacy(settings: ProfilePrivacy) {
  const allowed: VisibilityLevel[] = ['public', 'friends', 'private'];
  if (Object.values(settings).some((value) => !allowed.includes(value))) return { error: 'Configuración inválida' };
  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: 'No autorizado' };
  const { error } = await supabase.rpc('update_profile_privacy', {
    library_visibility: settings.library_favorites_visibility,
    anime_visibility: settings.featured_anime_visibility,
    manga_visibility: settings.featured_manga_visibility,
    characters_visibility: settings.featured_characters_visibility,
  });
  if (error) return { error: error.message };
  refreshSocialPages();
  return { success: true };
}

export async function updateSocialProfile(input: { username: string; bio: string; discoverable: boolean; allowFriendRequests: boolean }) {
  const username = input.username.trim();
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) return { error: 'El usuario debe tener entre 3 y 30 letras, números o guiones bajos.' };
  const { supabase, user } = await authenticatedClient();
  if (!user) return { error: 'No autorizado' };
  const { error } = await supabase.rpc('update_social_profile', {
    new_username: username,
    new_bio: input.bio.trim().slice(0, 300),
    new_discoverable: input.discoverable,
    new_allow_friend_requests: input.allowFriendRequests,
  });
  if (error) return { error: error.message.includes('already in use') ? 'Ese nombre de usuario ya está en uso.' : error.message };
  refreshSocialPages(username);
  return { success: true };
}

