export const PROFILE_IMAGE_BUCKET = 'anitrack-profile-images';
export const PROFILE_IMAGE_INPUT_LIMIT = 4 * 1024 * 1024;
export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

export const PROFILE_IMAGE_SPECS = {
  avatar: { width: 320, height: 320, maxBytes: 80 * 1024 },
  cover: { width: 1440, height: 480, maxBytes: 240 * 1024 },
} as const;

export type ProfileImageKind = keyof typeof PROFILE_IMAGE_SPECS;

export function isProfileImageKind(value: string): value is ProfileImageKind {
  return value === 'avatar' || value === 'cover';
}

export function profileImagePath(userId: string, kind: ProfileImageKind) {
  return `${userId}/${kind}.webp`;
}
