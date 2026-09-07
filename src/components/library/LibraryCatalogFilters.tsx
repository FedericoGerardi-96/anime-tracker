'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import Dropdown from '@/components/dropdown/dropdown';

interface Props {
  genres: string[];
  years: number[];
  formats: string[];
  showPersonalStatus?: boolean;
}

const optionList = (values: Array<string | number>, emptyLabel = 'Todos') => [
  { label: emptyLabel, value: 'all' },
  ...values.map((value) => ({ label: String(value), value: String(value) })),
];

export default function LibraryCatalogFilters({ genres, years, formats, showPersonalStatus = true }: Readonly<Props>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const advancedKeys = ['genre', 'catalogStatus', 'year', 'season', 'format', 'minScore'];
  const [advanced, setAdvanced] = useState(advancedKeys.some((key) => searchParams.has(key)));
  const value = (key: string, fallback = 'all') => searchParams.get(key) ?? fallback;

  const change = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, next] of Object.entries(changes)) {
      if (!next || next === 'all' || (key === 'sort' && next === 'Date Added') || (key === 'direction' && next === 'desc')) params.delete(key);
      else params.set(key, next);
    }
    params.set('page', '1');
    startTransition(() => router.push(`${pathname}?${params}`));
  };

  return <div className={`flex w-full flex-col gap-3 ${pending ? 'pointer-events-none opacity-60' : ''}`}>
    <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
      <Dropdown label='Tipo' value={value('type')} onChange={(next) => change({ type: next })} options={[{ label: 'Anime y manga', value: 'all' }, { label: 'Anime', value: 'anime' }, { label: 'Manga', value: 'manga' }]} />
      {showPersonalStatus && <Dropdown label='Mi estado' value={value('status')} onChange={(next) => change({ status: next })} options={[
        { label: 'Todos', value: 'all' }, { label: 'Viendo / Leyendo', value: 'watching' }, { label: 'Completado', value: 'completed' }, { label: 'Pendiente', value: 'plan_to_watch' }, { label: 'En pausa', value: 'on_hold' }, { label: 'Abandonado', value: 'dropped' },
      ]} />}
      <Dropdown label='Orden' value={value('sort', 'Date Added')} onChange={(next) => change({ sort: next })} options={[{ label: 'Fecha de agregado', value: 'Date Added' }, { label: 'Título', value: 'Title' }, { label: 'Puntuación', value: 'Score' }, { label: 'Año', value: 'Year' }]} />
      <button type='button' onClick={() => change({ direction: value('direction', 'desc') === 'asc' ? 'desc' : 'asc' })} className='flex h-10 items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 text-sm hover:bg-primary/10' title='Invertir orden'>
        <span className='material-symbols-outlined'>{value('direction', 'desc') === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
      </button>
      <button type='button' onClick={() => setAdvanced((open) => !open)} className='flex h-10 items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-4 text-sm font-semibold hover:bg-primary/10'><span className='material-symbols-outlined text-lg'>tune</span>Más filtros<span className='material-symbols-outlined text-sm'>{advanced ? 'expand_less' : 'expand_more'}</span></button>
    </div>
    {advanced && <div className='flex flex-col gap-3 rounded-xl border border-primary/10 bg-background/35 p-3 sm:flex-row sm:flex-wrap'>
      <Dropdown label='Género' value={value('genre')} onChange={(next) => change({ genre: next })} options={optionList(genres)} />
      <Dropdown label='Estado de la obra' value={value('catalogStatus')} onChange={(next) => change({ catalogStatus: next })} options={[
        { label: 'Todos', value: 'all' }, { label: 'En emisión / publicación', value: 'RELEASING' }, { label: 'Finalizada', value: 'FINISHED' }, { label: 'Próximamente', value: 'NOT_YET_RELEASED' }, { label: 'En pausa', value: 'HIATUS' }, { label: 'Cancelada', value: 'CANCELLED' },
      ]} />
      <Dropdown label='Año' value={value('year')} onChange={(next) => change({ year: next })} options={optionList(years)} />
      <Dropdown label='Temporada' value={value('season')} onChange={(next) => change({ season: next })} options={[{ label: 'Todas', value: 'all' }, { label: 'Invierno', value: 'winter' }, { label: 'Primavera', value: 'spring' }, { label: 'Verano', value: 'summer' }, { label: 'Otoño', value: 'fall' }]} />
      <Dropdown label='Formato' value={value('format')} onChange={(next) => change({ format: next })} options={optionList(formats)} />
      <Dropdown label='Puntuación mínima' value={value('minScore')} onChange={(next) => change({ minScore: next })} options={[{ label: 'Cualquiera', value: 'all' }, { label: '6 o más', value: '6' }, { label: '7 o más', value: '7' }, { label: '8 o más', value: '8' }, { label: '9 o más', value: '9' }]} />
    </div>}
  </div>;
}
