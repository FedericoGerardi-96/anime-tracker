'use client';

import Image from 'next/image';
import type { IFavorites, Media } from '@/types/favorites';
import { getCatalogStatusLabel } from '@/lib/media-status';

const STATUS: Record<string, string> = { watching: 'Viendo / Leyendo', completed: 'Completado', plan_to_watch: 'Pendiente', on_hold: 'En pausa', dropped: 'Abandonado' };

export default function FavoriteDetailsDrawer({ favorite, onClose }: Readonly<{ favorite: IFavorites; onClose: () => void }>) {
  const media = (Array.isArray(favorite.media) ? favorite.media[0] : favorite.media) as Media;
  const metadata = favorite.user_metadata;
  const progress = favorite.progress;
  const current = progress?.current_episode ?? 0;
  const total = media.total_units;
  const progressLabel = media.type === 'manga' ? 'Capítulo / página actual' : 'Episodios vistos';

  return <div className='fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm' onClick={onClose} role='presentation'>
    <aside className='ml-auto flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-background p-6 shadow-2xl sm:p-8' onClick={(event) => event.stopPropagation()} aria-label={`Información de ${media.title}`}>
      <div className='mb-7 flex items-start justify-between gap-4'>
        <div className='flex min-w-0 gap-4'>
          <div className='relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-muted'><Image src={media.image} alt={media.title} fill sizes='80px' className='object-cover' /></div>
          <div className='min-w-0'><span className='text-[10px] font-black uppercase tracking-widest text-primary'>{media.type}</span><h2 className='mt-1 text-2xl font-black leading-tight'>{media.title}</h2><p className='mt-2 text-sm text-muted-foreground'>{[media.format, media.year, media.season].filter(Boolean).join(' · ')}</p></div>
        </div>
        <button type='button' onClick={onClose} className='flex size-10 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted' aria-label='Cerrar'><span className='material-symbols-outlined'>close</span></button>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-2xl border border-border bg-card p-4'><span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Mi estado</span><strong className='mt-1 block'>{STATUS[progress?.status ?? ''] ?? 'Sin definir'}</strong></div>
        <div className='rounded-2xl border border-border bg-card p-4'><span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>{progressLabel}</span><strong className='mt-1 block text-xl text-primary'>{total ? `${current} / ${total}` : current || 'Sin registrar'}</strong></div>
        <div className='rounded-2xl border border-border bg-card p-4'><span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Puntuación</span><strong className='mt-1 block'>{media.score ? media.score.toFixed(1) : '—'}</strong></div>
        <div className='rounded-2xl border border-border bg-card p-4'><span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Estado de la obra</span><strong className='mt-1 block'>{media.status ? getCatalogStatusLabel(media.status, media.type === 'manga' ? 'manga' : 'anime') : '—'}</strong></div>
      </div>

      <section className='mt-7'><h3 className='mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>Mis notas</h3><div className='whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed'>{metadata?.custom_description || 'Todavía no agregaste notas personales.'}</div></section>
      <section className='mt-7'><h3 className='mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>Mis etiquetas</h3><div className='flex flex-wrap gap-2'>{metadata?.custom_tags?.length ? metadata.custom_tags.map((tag) => <span key={tag} className='rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary'>{tag}</span>) : <span className='text-sm text-muted-foreground'>Sin etiquetas personales.</span>}</div></section>
      {metadata?.watch_link && <a href={metadata.watch_link} target='_blank' rel='noreferrer' className='mt-7 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground'><span className='material-symbols-outlined text-lg'>open_in_new</span>{media.type === 'manga' ? 'Continuar leyendo' : 'Continuar viendo'}</a>}
    </aside>
  </div>;
}
