import Image from 'next/image';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import type { ProfileHighlight, ProfileHighlightCategory } from '@/types/profile-highlights';

const LABELS: Record<ProfileHighlightCategory, string> = { anime: 'Anime', manga: 'Manga', character: 'Personajes' };

export default function ProfileHighlights({ items, editable }: Readonly<{ items: ProfileHighlight[]; editable?: boolean }>) {
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-black"><span className="material-symbols-outlined text-primary">hotel_class</span>Favoritos destacados</h2><p className="mt-1 text-sm text-muted-foreground">Las historias y personajes que más te representan.</p></div>
      {editable && <Link href="/profile/highlights" className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/15"><span className="material-symbols-outlined text-lg">edit</span>Editar favoritos</Link>}
    </div>
    {items.length === 0 ? <div className="rounded-3xl border border-dashed border-border bg-card/50 p-10 text-center"><span className="material-symbols-outlined text-4xl text-muted-foreground">star_border</span><p className="mt-3 text-sm text-muted-foreground">Todavía no elegiste tus favoritos destacados.</p>{editable && <Link href="/profile/highlights" className="mt-4 inline-block font-bold text-primary">Crear mi top</Link>}</div> : <div className="space-y-7">
      {(['anime', 'manga', 'character'] as ProfileHighlightCategory[]).map((category) => {
        const group = items.filter((item) => item.category === category).sort((a, b) => a.position - b.position);
        if (!group.length) return null;
        return <div key={category}><h3 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{LABELS[category]} <span className="text-primary">({group.length})</span></h3><div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">{group.map((item) => {
          const canonicalIds = item.anilist_id || item.mal_id ? `${item.anilist_id ?? 0}-${item.mal_id ?? 0}` : null;
          const characterId = canonicalIds ?? (item.provider === 'myanimelist' ? `mal-${item.external_id}` : item.external_id);
          const href = category === 'character' ? `/characters/${characterId}-${slugify(item.title)}` : `/${category}/${item.external_id}-${slugify(item.title)}`;
          return <Link href={href} key={item.external_id} className="group min-w-0"><div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted shadow-lg"><span className="absolute left-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/70 text-[10px] font-black text-white">{item.position + 1}</span>{item.image_url && <Image src={item.image_url} alt={item.title} fill sizes="(max-width: 640px) 30vw, 120px" className="object-cover transition duration-500 group-hover:scale-105" />}<div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent"/><p className="absolute inset-x-0 bottom-0 truncate p-2 text-[11px] font-bold text-white">{item.title}</p></div></Link>;
        })}</div></div>;
      })}
    </div>}
  </section>;
}

