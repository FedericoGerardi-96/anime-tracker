import 'server-only';
import { providerRead, ProviderRequestError } from '@/services/provider-request';

export interface ReleaseDetail {
  title: string;
  summary: string;
  cover: string | null;
  episode: number | null;
  links: { label: string; href: string }[];
}
const text = (value: unknown) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
export async function readReleaseDetail(source: string, id: number): Promise<ReleaseDetail | null> {
  if (source === 'maze') {
    const response = await fetch('https://api.tvmaze.com/episodes/' + id + '?embed=show', {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(7000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('TVmaze no respondió');
    const entry = await response.json();
    const show = entry?._embedded?.show;
    if (
      entry?.id !== id ||
      show?.type !== 'Animation' ||
      show?.language !== 'Japanese' ||
      !Number.isSafeInteger(show.id) ||
      !text(show.name)
    )
      return null;
    const links = [{ label: 'TVmaze', href: 'https://www.tvmaze.com/shows/' + show.id }];
    if (typeof show.externals?.imdb === 'string' && /^tt\d+$/.test(show.externals.imdb))
      links.push({ label: 'IMDb', href: 'https://www.imdb.com/title/' + show.externals.imdb + '/' });
    return {
      title: text(show.name),
      summary: text(show.summary),
      cover:
        typeof show.image?.medium === 'string' &&
        show.image.medium.startsWith('https://static.tvmaze.com/uploads/images/')
          ? show.image.medium
          : null,
      episode: Number.isInteger(entry.number) ? entry.number : null,
      links,
    };
  }
  const result = await providerRead<{
    data?: {
      AiringSchedule?: {
        id: number;
        episode: number;
        media: {
          id: number;
          isAdult: boolean;
          description: string | null;
          title: { romaji: string; english: string | null };
          coverImage: { large: string | null };
        };
      };
    };
  }>('anilist', 'calendar-detail', 'https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 86400 },
    body: JSON.stringify({
      query:
        'query($id:Int!){AiringSchedule(id:$id){id episode media{id isAdult description(asHtml:false) title{romaji english} coverImage{large}}}}',
      variables: { id },
    }),
  }).catch((error) => {
    if (error instanceof ProviderRequestError && error.status === 404) return null;
    throw error;
  });
  const entry = result?.data?.AiringSchedule;
  if (
    !entry ||
    entry.id !== id ||
    entry.media?.isAdult !== false ||
    !Number.isSafeInteger(entry.media.id)
  )
    return null;
  const media = entry.media;
  return {
    title: text(media.title.english || media.title.romaji),
    summary: text(media.description),
    cover: media.coverImage.large?.startsWith('https://s4.anilist.co/') ? media.coverImage.large : null,
    episode: entry.episode,
    links: [{ label: 'AniList', href: 'https://anilist.co/anime/' + media.id }],
  };
}
