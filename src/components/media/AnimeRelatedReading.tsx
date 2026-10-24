import Image from 'next/image';
import Link from 'next/link';
import { getAnimeRelatedReading } from '@/services/related-reading';
import { slugify } from '@/lib/utils';
import { relatedReadingImage } from '@/lib/related-reading-image';

export default async function AnimeRelatedReading({ malId }: Readonly<{ malId: number }>) {
  const related = await getAnimeRelatedReading(malId);
  if (!related.length) return null;

  return (
    <section className="mb-16" aria-labelledby="related-reading-title">
      <div className="mb-6">
        <h2 id="related-reading-title" className="text-2xl font-bold text-foreground">Manga y novelas relacionados</h2>
        <p className="mt-1 text-sm text-muted-foreground">Explorá la obra original u otras versiones de esta historia.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {related.map((item) => (
          <Link key={item.malId} href={`/manga/${item.malId}-${slugify(item.title)}`} className="group flex min-w-0 gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/50">
            <div className="relative h-24 w-17 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.image && <Image src={relatedReadingImage(item.image)} alt="" fill sizes="68px" className="object-cover" />}
            </div>
            <div className="min-w-0 self-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{item.format === 'novel' ? 'Novela ligera' : 'Manga'}</span>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-foreground group-hover:text-primary">{item.title}</h3>
              {item.relation && <p className="mt-1 text-xs text-muted-foreground">{item.relation}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
