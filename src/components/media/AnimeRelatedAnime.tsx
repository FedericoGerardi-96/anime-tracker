import Image from 'next/image';
import Link from 'next/link';
import { getAnimeRelations } from '@/services/media-detail';
import { getRelatedAnimeStatuses } from '@/services/related-anime';
import { formatLabel, libraryStatuses } from '@/lib/library-editor';
import { slugify } from '@/lib/utils';

export default async function AnimeRelatedAnime({ malId }: { malId: number }) {
  const related = await getAnimeRelations(malId).catch(() => null);
  if (!related) return <section className="mb-9"><h2 className="mb-3 text-xl font-bold">Animes relacionados</h2><p className="text-sm text-muted-foreground">No pudimos cargar los animes relacionados. Probá recargar la ficha.</p></section>;
  if (!related.length) return null;
  const statuses = await getRelatedAnimeStatuses(related.map(item => item.malId)).catch(() => null);
  return <section className="mb-9" aria-labelledby="related-anime-title">
    <h2 id="related-anime-title" className="mb-2 text-xl font-bold">Animes relacionados</h2>
    <p className="mb-5 text-sm text-muted-foreground">Temporadas, películas y otras historias de este anime.</p>
    {!statuses && <p className="mb-4 text-sm text-muted-foreground">No pudimos consultar tu progreso. Los títulos siguen disponibles.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {related.map(item => {
        const status = libraryStatuses.find(value => value.value === statuses?.get(item.malId));
        return <Link key={item.malId} href={`/anime/${item.malId}-${slugify(item.title)}`} className="group flex min-w-0 gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/50">
          <div className="relative h-24 w-17 shrink-0 overflow-hidden rounded-lg bg-muted"><Image src={item.image || '/placeholder-cover.svg'} alt="" fill sizes="68px" className="object-cover" /></div>
          <div className="min-w-0 self-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{formatLabel('anime', item.format)} · {item.relation}</p>
            <h3 className="mt-1 text-sm font-bold group-hover:text-primary">{item.title}</h3>
            {status && <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><span aria-hidden="true">{status.value === 'completed' ? '✓' : '●'}</span>{status.label}</span>}
          </div>
        </Link>;
      })}
    </div>
  </section>;
}
