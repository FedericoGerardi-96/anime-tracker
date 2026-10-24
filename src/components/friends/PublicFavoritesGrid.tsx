import Link from 'next/link';
import { slugify } from '@/lib/utils';

interface FavoriteRow { id: string; media: { mal_id: number; title: string; type: string; image: string; year?: number | null; format?: string | null; score?: number | null } | Array<{ mal_id: number; title: string; type: string; image: string; year?: number | null; format?: string | null; score?: number | null }> }

export default function PublicFavoritesGrid({ items }: Readonly<{ items: FavoriteRow[] }>) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{items.map((row) => {
    const media = Array.isArray(row.media) ? row.media[0] : row.media;
    if (!media) return null;
    return <Link key={row.id} href={`/${media.type}/${media.mal_id}-${slugify(media.title)}`} className="group min-w-0"><div className="relative aspect-2/3 overflow-hidden rounded-2xl border border-border bg-muted"><div className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${media.image}')` }} /><div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent"/><span className="absolute left-3 top-3 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-black uppercase text-white">{media.type}</span>{media.score ? <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2 py-1 text-xs font-bold text-amber-300">★ {Number(media.score).toFixed(1)}</span> : null}</div><h3 className="mt-2 truncate text-sm font-bold group-hover:text-primary">{media.title}</h3><p className="truncate text-xs text-muted-foreground">{[media.format, media.year].filter(Boolean).join(' · ')}</p></Link>;
  })}</div>;
}

