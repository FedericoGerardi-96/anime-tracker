import type { MediaTitleVariants } from '@/interfaces/media-titles';

// Optional catalog metadata can also arrive through a Server Action: validate it here.
export function cleanMediaTitles(input: unknown): MediaTitleVariants {
  if (!input || typeof input !== 'object') return {};
  const result: MediaTitleVariants = {};
  for (const key of ['title_english', 'title_romaji'] as const) {
    const value: unknown = Reflect.get(input, key);
    if (typeof value === 'string' && value.trim() && value.trim().length <= 500) {
      result[key] = value.trim();
    }
  }
  return result;
}
