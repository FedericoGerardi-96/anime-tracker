export type ListVisibility = 'private' | 'link' | 'public';

export type ListShareSettings =
  | { visibility: 'private'; slug: null }
  | { visibility: 'link' | 'public'; slug: string };

export function isListVisibility(value: unknown): value is ListVisibility {
  return value === 'private' || value === 'link' || value === 'public';
}

export function isShareSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
}

export function parseListShareSettings(row: { visibility: unknown; share_slug: unknown }): ListShareSettings | null {
  if (row.visibility === 'private' && row.share_slug === null) return { visibility: 'private', slug: null };
  if ((row.visibility === 'link' || row.visibility === 'public') && isShareSlug(row.share_slug)) {
    return { visibility: row.visibility, slug: row.share_slug };
  }
  return null;
}

export function sharedListPath(slug: string) {
  return '/l/' + slug;
}

export const FOLLOWED_LISTS_PATH = '/lists?tab=friends';

export function isListUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

export function ownedListPath(id: string) {
  return '/lists?tab=custom_lists&list=' + encodeURIComponent(id);
}

export function sharedListReturnPath(value: unknown) {
  return typeof value === 'string' && /^\/l\/[0-9a-f]{32}$/.test(value) ? value : null;
}
