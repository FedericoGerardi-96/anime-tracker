import type { ProfileAvatarOption } from '@/interfaces/profile-avatar';

export const DEFAULT_PROFILE_AVATAR = '/avatars/default-blonde.jpg';
export const BUILT_IN_PROFILE_AVATARS: ProfileAvatarOption[] = [
  { id: 'default', collection_title: 'AniTrack', name: 'Rubia de ojos celestes', image_url: DEFAULT_PROFILE_AVATAR, sort_order: 0 },
  { id: '00000000-0000-4000-8000-000000000001', collection_title: 'AniTrack', name: 'Retrato masculino', image_url: '/avatars/default-male.jpg', sort_order: 1 },
  { id: '00000000-0000-4000-8000-000000000002', collection_title: 'AniTrack', name: 'Cobayo', image_url: '/avatars/default-guinea-pig.jpg', sort_order: 2 },
];
const builtInAvatarUrls = new Set(BUILT_IN_PROFILE_AVATARS.map((avatar) => avatar.image_url));

export function normalizeProfileAvatar(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  let candidate = value.trim();
  const markdownLink = /^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/.exec(candidate);
  if (markdownLink) candidate = markdownLink[1];
  candidate = candidate.trim().replace(/^(?:%20)+|(?:%20)+$/gi, '').trim();
  if (builtInAvatarUrls.has(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function getProfileAvatar(...values: unknown[]): string | null {
  for (const value of values) {
    const avatar = normalizeProfileAvatar(value);
    if (avatar) return avatar;
  }
  return null;
}

export function profileAvatarBackground(avatar: string): string {
  return `url(${JSON.stringify(avatar)})`;
}
