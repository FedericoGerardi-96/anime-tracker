import 'server-only';
import { cache } from 'react';
import { getSupabaseServer } from '@/services/supabase';
import { isProfileImageKind, PROFILE_IMAGE_BUCKET, profileImagePath } from '@/lib/profile-image';

const EMPTY_IMAGES = { avatar: null, cover: null };
type ProfileImages = Record<'avatar' | 'cover', string | null>;

export async function getProfileImagesByUser(userIds: string[]) {
  const images = new Map<string, ProfileImages>();
  const ids = [...new Set(userIds)];
  if (!ids.length) return images;

  const db = await getSupabaseServer();
  const bucket = db.storage.from(PROFILE_IMAGE_BUCKET);
  for (let offset = 0; offset < ids.length; offset += 25) {
    const batch = ids.slice(offset, offset + 25);
    const { data, error } = await db.rpc('get_profile_image_versions', { profile_ids: batch });
    if (error || !Array.isArray(data)) return null;
    const requested = new Set(batch);
    const rows: unknown[] = data;
    for (const row of rows) {
      if (typeof row !== 'object' || !row || !('profile_id' in row) || !('kind' in row) || !('revision' in row)) continue;
      const { profile_id: id, kind, revision } = row;
      if (typeof id !== 'string' || !requested.has(id) || typeof kind !== 'string' || !isProfileImageKind(kind)
        || typeof revision !== 'string' || !revision || revision.length > 100) continue;
      const entry = images.get(id) ?? { ...EMPTY_IMAGES };
      const url = new URL(bucket.getPublicUrl(profileImagePath(id, kind)).data.publicUrl);
      url.searchParams.set('cacheNonce', revision);
      entry[kind] = url.href;
      images.set(id, entry);
    }
  }
  return images;
}

export const getProfileImages = cache(async (userId: string) => {
  const images = await getProfileImagesByUser([userId]);
  return { ...(images?.get(userId) ?? EMPTY_IMAGES), available: images !== null };
});
