import Image from 'next/image';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { getHomeReadingSuggestions } from '@/services/home';
import { relatedReadingImage } from '@/lib/related-reading-image';

export default async function HomeReadingSuggestions() {
  const suggestions = await getHomeReadingSuggestions();
  if (!suggestions.length) return null;

  return (
    <section aria-labelledby="reading-suggestions-title">
      <div className="mb-5">
        <h2 id="reading-suggestions-title" className="text-2xl font-bold tracking-tight">Mangas y novelas de tus animes completados</h2>
        <p className="mt-1 text-sm text-muted-foreground">Descubrí otras versiones e historias relacionadas con las series que terminaste.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {suggestions.map(({ animeTitle, reading }) => (
          <Link key={reading.malId} href={`/manga/${reading.malId}-${slugify(reading.title)}`} className="group flex min-w-0 gap-4 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {reading.image && <Image src={relatedReadingImage(reading.image)} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="min-w-0 self-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{reading.format === 'novel' ? 'Novela ligera' : 'Manga'}</span>
              <h3 className="mt-1 line-clamp-2 font-bold text-foreground group-hover:text-primary">{reading.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">Relacionado con {animeTitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
