import { getCalendarMappings } from '@/services/calendar-mappings';

export default async function AnimeSourceLinks({ malId }: { malId: number }) {
  const mappings = await getCalendarMappings().catch(() => null);
  const record = mappings?.byMal[malId];
  const links = [{ name: 'MyAnimeList', href: 'https://myanimelist.net/anime/' + malId }];
  if (record?.ani) links.push({ name: 'AniList', href: 'https://anilist.co/anime/' + record.ani });
  if (record?.imdb) links.push({ name: 'IMDb', href: 'https://www.imdb.com/title/' + record.imdb + '/' });
  return (
    <nav
      aria-label="Más información"
      className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-primary"
    >
      {links.map((link) => (
        <a key={link.name} href={link.href} className=" ">
          {link.name}
        </a>
      ))}
    </nav>
  );
}
