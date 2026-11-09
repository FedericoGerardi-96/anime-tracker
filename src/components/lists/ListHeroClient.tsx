'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { drawListAnime } from '@/lib/actions/list-roulette';
import { slugify } from '@/lib/utils';
import type { HeroItem, summarizeList } from '@/lib/list-hero';
import styles from './ListHero.module.css';

const display = Unbounded({ subsets: ['latin'], weight: '700', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: '400', display: 'swap' });
interface Props {
  tab: string; listId?: string; title: string; description?: string | null;
  covers: HeroItem[]; summary: ReturnType<typeof summarizeList>; candidates: number;
  shareControl?: ReactNode;
}
function Cover({ item, sizes }: { item: HeroItem; sizes: string }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed ? <Image src={item.image} alt="" fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} /> : <span className="absolute inset-0 bg-muted" aria-hidden="true" />;
}
export default function ListHeroClient({ tab, listId, title, description, covers, summary, candidates, shareControl }: Props) {
  const [result, setResult] = useState<{ item: HeroItem; count: number } | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const draw = () => {
    setError('');
    startTransition(async () => {
      const response = await drawListAnime(tab, listId, result?.item.id);
      if ('item' in response && response.item) setResult({ item: response.item, count: response.count });
      else setError(response.error ?? 'No pudimos sortear un anime.');
    });
  };
  const button = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50';
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end gap-6">
      <div className={styles.covers} aria-hidden="true">
        {covers.length ? covers.map(item => <div key={item.id} className={styles.cover}><Cover item={item} sizes="112px" /></div>) : <div className={styles.cover} />}
      </div>
      <div className="min-w-0 flex-1 basis-64 space-y-3">
        <p className={mono.className + ' text-[10px] uppercase tracking-[0.16em] text-primary'}>{listId ? 'Colección personal' : 'Mi biblioteca'}</p>
        <h1 className={display.className + ' break-words text-3xl leading-tight sm:text-[40px]'}>{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className={mono.className + ' flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground'}>
          <span>{summary.total} títulos</span>
          <span>{summary.completed} completados</span>
          <span>{summary.remaining} por completar</span>
          {summary.episodes > 0 && <span>{summary.unknown ? 'Al menos ' : ''}{summary.episodes} episodios por ver</span>}
          {summary.unknown > 0 && <span>{summary.unknown} anime sin total de episodios</span>}
        </div>
        <div className={styles.progress} role="progressbar" aria-label="Títulos completados" aria-valuemin={0} aria-valuemax={Math.max(1, summary.total)} aria-valuenow={summary.completed} aria-valuetext={summary.completed + ' de ' + summary.total + ' títulos completados'}>
          <span style={{ width: (summary.total ? summary.completed / summary.total * 100 : 0) + '%' }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={draw} disabled={pending || candidates === 0} aria-describedby={candidates === 0 ? 'roulette-empty' : undefined} className={button + ' bg-primary text-primary-foreground'}>
          <span aria-hidden="true" className="material-symbols-outlined text-lg">shuffle</span>{pending ? 'Eligiendo…' : '¿Qué veo hoy?'}
        </button>
        {shareControl}
      </div>
    </header>
    {candidates === 0 && <p id="roulette-empty" className="text-sm text-muted-foreground">No hay anime pendientes o sin estado para sortear.</p>}
    {error && <p role="alert" className="text-sm text-foreground">{error}</p>}
    <div aria-live="polite" aria-atomic="true">
      {result && <section className={styles.result + ' flex flex-wrap items-center gap-4 rounded-2xl p-4 sm:p-5'} aria-label="Resultado de la ruleta">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg"><Cover key={result.item.id} item={result.item} sizes="56px" /></div>
        <div className="min-w-0 flex-1 basis-48">
          <p className={mono.className + ' mb-1 text-[10px] uppercase tracking-[0.14em] text-primary'}>Salió en la ruleta</p>
          <h2 className="break-words text-lg font-bold">{result.item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{result.item.total ? result.item.total + ' episodios' : 'Total de episodios sin confirmar'} · elegido entre {result.count} anime pendientes o sin estado</p>
        </div>
        <Link href={'/anime/' + result.item.malId + '-' + slugify(result.item.title)} className={button + ' bg-primary text-primary-foreground'}>Ver anime</Link>
        <button type="button" onClick={draw} disabled={pending} className={button + ' text-muted-foreground hover:text-primary'}>Tirar de nuevo</button>
      </section>}
    </div>
  </div>;
}
