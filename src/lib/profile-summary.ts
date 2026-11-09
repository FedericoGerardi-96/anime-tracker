import { currentSchedulePeriod } from '@/lib/schedule-filters';

export type WatchingAnime = {
  mal_id: number;
  title: string;
  image: string | null;
  total_units: number | null;
  current_episode: number;
};

export type AnimeProfileSummary = {
  completed: number;
  episodes: number;
  genres: { name: string; count: number }[];
  watching: WatchingAnime[];
};

type AnimeProgress = {
  current_episode: number | null;
  status: string;
  media: Omit<WatchingAnime, 'current_episode'> & {
    genres: string[] | null;
    season: string | null;
    year: number | null;
  };
};

// Owner-only fallback for deployments that haven't applied the public summary migration.
// Rows arrive in descending order of update, with the ID as a stable tiebreaker.
export function summarizeAnimeProgress(rows: AnimeProgress[], period = currentSchedulePeriod()): AnimeProfileSummary {
  const genres = new Map<string, number>();
  const seasonal: WatchingAnime[] = [];
  const other: WatchingAnime[] = [];
  let completed = 0;
  let episodes = 0;

  for (const { media, status, current_episode } of rows) {
    const episode = Math.max(0, current_episode ?? 0);
    if (status === 'completed') completed++;
    episodes += episode;
    if (episode > 0 || status === 'completed') {
      for (const name of new Set(media.genres?.map(genre => genre.trim()).filter(Boolean))) {
        genres.set(name, (genres.get(name) ?? 0) + 1);
      }
    }
    if (status === 'watching' && media.mal_id > 0) {
      const { mal_id, title, image, total_units, year, season } = media;
      const group = year === period.year && season?.toLowerCase() === period.season ? seasonal : other;
      if (group.length < 3) group.push({ mal_id, title, image, total_units, current_episode: episode });
    }
  }

  return {
    completed,
    episodes,
    genres: [...genres].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1)).slice(0, 5),
    watching: [...seasonal, ...other].slice(0, 3),
  };
}
