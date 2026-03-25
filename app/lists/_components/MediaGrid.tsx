'use client';

import Link from 'next/link';
import { slugify } from '@/lib/utils';

interface MediaItem {
  id: string;
  current_episode?: number;
  media: {
    id: string;
    mal_id: number;
    title: string;
    image: string;
    type: string;
    description?: string;
  };
}

interface MediaGridProps {
  items: MediaItem[];
  searchQuery: string;
  activeTabLabel: string;
  selectedListName?: string;
}

export default function MediaGrid({ items, searchQuery, activeTabLabel, selectedListName }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <div className='col-span-full py-32 text-center rounded-3xl border border-dashed border-white/10 bg-white/5'>
        <span className='material-symbols-outlined text-6xl text-slate-700 mb-4 block'>
          {searchQuery ? 'manage_search' : 'sentiment_dissatisfied'}
        </span>
        <h3 className='text-xl font-bold text-white mb-2'>
          {searchQuery ? 'No results found' : 'No active items here'}
        </h3>
        <p className='text-slate-500 mb-6'>
          {searchQuery
            ? `Nothing matched "${searchQuery}". Try a different search term.`
            : `You don\u0027t have any items marked as '${selectedListName || activeTabLabel}'.`}
        </p>
        {!searchQuery && (
          <Link
            href='/anime'
            className='inline-block px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all'
          >
            Discover Anime
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/${item.media.type || 'anime'}/${item.media.mal_id}-${slugify(item.media.title)}`}
          className='group relative bg-slate-900/40 rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-primary/50 transition-all hover:scale-[1.02]'
        >
          <div className='aspect-2/3 relative'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.media.image}
              alt={item.media.title}
              className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
            />
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

            <div className='absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end'>
              <h3 className='font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors'>
                {item.media.title}
              </h3>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
