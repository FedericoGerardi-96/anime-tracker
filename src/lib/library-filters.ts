import type { GetFavoritesOptions } from '@/interfaces/favorites-service';

export const libraryYear = (value: unknown): number | undefined => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() + 1 ? year : undefined;
};

export const filterValues = (value?: string) => [...new Set((value ?? '').split(',').filter((item) => item && item !== 'all' && item !== 'All Statuses'))];
export const LIBRARY_STATUS_GROUPS: Record<string, string[]> = {
  RELEASING: ['RELEASING', 'currently_airing', 'currently_publishing'], FINISHED: ['FINISHED', 'finished_airing', 'finished'],
  NOT_YET_RELEASED: ['NOT_YET_RELEASED', 'not_yet_aired', 'not_yet_published'], HIATUS: ['HIATUS', 'on_hiatus'], CANCELLED: ['CANCELLED', 'discontinued'],
};
export const catalogStatuses = (value?: string) => filterValues(value).flatMap((status) => LIBRARY_STATUS_GROUPS[status] ?? [status]);
export const LIBRARY_SCORE_BANDS: Record<string, [number, number]> = { under6: [0, 6], '6to7': [6, 7], '7to8': [7, 8], '8to9': [8, 9], '9plus': [9, 11] };
export const scoreRanges = (value?: string) => filterValues(value).filter((key) => LIBRARY_SCORE_BANDS[key]).map((key) => LIBRARY_SCORE_BANDS[key]);
export function hasExtendedLibraryFilters(options: GetFavoritesOptions) {
  return Boolean(filterValues(options.status).length || options.excludeGenre || options.yearFrom || options.yearTo || options.scoreBands || [options.genre, options.status, options.catalogStatus, options.format, options.season, options.mediaType].some((value) => filterValues(value).length > 1));
}
export function matchesLibraryFilters(media: {type: string; genres?: string[] | null; year?: number | null; season?: string | null; format?: string | null; score?: number | null; status?: string | null}, options: GetFavoritesOptions, personalStatus?: string | null) {
  const matches = (value: string | null | undefined, filter?: string) => !filterValues(filter).length || filterValues(filter).includes(value ?? '');
  const ranges = scoreRanges(options.scoreBands);
  const from = options.yearFrom && options.yearTo ? Math.min(options.yearFrom, options.yearTo) : options.yearFrom;
  const to = options.yearFrom && options.yearTo ? Math.max(options.yearFrom, options.yearTo) : options.yearTo;
  return matches(media.type, options.mediaType)
    && filterValues(options.genre).every((genre) => media.genres?.includes(genre))
    && !filterValues(options.excludeGenre).some((genre) => media.genres?.includes(genre))
    && (!options.year || media.year === options.year)
    && (!from || (media.year != null && media.year >= from)) && (!to || (media.year != null && media.year <= to))
    && matches(media.season, options.season) && matches(media.format, options.format)
    && (!options.minScore || (media.score != null && media.score >= options.minScore))
    && (!ranges.length || (media.score != null && ranges.some(([lower, upper]) => media.score! >= lower && media.score! < upper)))
    && (!catalogStatuses(options.catalogStatus).length || catalogStatuses(options.catalogStatus).includes(media.status ?? ''))
    && matches(personalStatus, options.status);
}
