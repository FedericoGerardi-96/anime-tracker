import Link from 'next/link';
import Image from 'next/image';

import type { MediaGridProps } from '@/interfaces/lists';
import { slugify } from '@/lib/utils';
import QuickStatusSelect from '@/components/library/QuickStatusSelect';

export default function MediaGrid({ items, searchQuery, activeTabLabel, selectedListName }: Readonly<MediaGridProps>) {
  if (items.length === 0) {
    return (
      <div className='col-span-full py-32 text-center rounded-3xl border border-dashed border-white/10 bg-white/5'>
        <span className='material-symbols-outlined text-6xl text-slate-700 mb-4 block'>
          {searchQuery ? 'manage_search' : 'sentiment_dissatisfied'}
        </span>
        <h3 className='mb-2 text-xl font-bold text-foreground'>
          {searchQuery ? 'No se encontraron resultados' : 'No hay elementos aquí'}
        </h3>
        <p className='mb-6 text-muted-foreground'>
          {searchQuery
            ? `Nada coincide con "${searchQuery}". Probá con otra búsqueda.`
            : `No tenés elementos en '${selectedListName || activeTabLabel}'.`}
        </p>
        {!searchQuery && (
          <Link
            href='/anime'
            className='inline-block px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all'
          >
            Descubrir anime
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <div
          key={item.id}
          className='group relative bg-slate-900/40 rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-primary/50 transition-all hover:scale-[1.02]'
        >
          <Link href={`/${item.media.type || 'anime'}/${item.media.mal_id}-${slugify(item.media.title)}`} className='block'>
          <div className='aspect-2/3 relative'>
            {item.media.image ? <Image
              src={item.media.image}
              alt=""
              fill
              sizes="(max-width: 639px) 45vw, (max-width: 767px) 30vw, (max-width: 1023px) 22vw, (max-width: 1279px) 18vw, 15vw"
              loading={index < 2 ? 'eager' : 'lazy'}
              fetchPriority={index < 2 ? 'high' : 'auto'}
              className='object-cover transition-transform duration-500 group-hover:scale-110'
            /> : <span className='absolute inset-0 bg-muted' aria-hidden='true' />}
            <div className='absolute inset-0 bg-linear-to-t from-slate-950 via-slate-900/60 to-transparent' />

            <div className='absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 z-10'>
              <span className='text-[10px] font-black uppercase tracking-wider text-white'>
                {item.media.type === 'manga' ? 'Manga' : 'Anime'}
              </span>
            </div>

            {(item.current_episode ?? 0) > 0 && (
              <div className='absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-white text-[10px] font-black border border-white/10 z-10 shadow-lg'>
                {item.media.type === 'manga' ? 'CH' : 'EP'} {item.current_episode}
              </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end ${item.status ? 'pb-12' : ''}`}>
              <h3 className='font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors'>
                {item.media.title}
              </h3>
            </div>
          </div>
          </Link>
          {item.status && (
              <QuickStatusSelect
                key={`${item.media.id}-${item.status}`}
                compact
                overlay
                mediaId={item.media.id}
                malId={item.media.mal_id}
                mediaType={item.media.type as 'anime' | 'manga'}
                initialStatus={item.status}
                currentEpisode={item.current_episode ?? 0}
              />
          )}
        </div>
      ))}
    </>
  );
}
