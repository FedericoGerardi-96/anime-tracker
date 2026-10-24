'use client';

import { useState } from 'react';

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 1;

interface Props {
  from?: string | null;
  to?: string | null;
  onApply: (from: string | null, to: string | null) => void;
}

export default function YearRangeFilter({ from, to, onApply }: Props) {
  const clamp = (value: number) => Math.max(MIN_YEAR, Math.min(MAX_YEAR, value));
  const [start, setStart] = useState(clamp(Number(from) || MIN_YEAR));
  const [end, setEnd] = useState(clamp(Number(to) || MAX_YEAR));
  const [startText, setStartText] = useState(String(start));
  const [endText, setEndText] = useState(String(end));
  const apply = (lower = start, upper = end) => {
    const nextFrom = lower === MIN_YEAR ? null : String(lower);
    const nextTo = upper === MAX_YEAR ? null : String(upper);
    if (nextFrom !== (from ?? null) || nextTo !== (to ?? null)) onApply(nextFrom, nextTo);
  };
  const left = (start - MIN_YEAR) / (MAX_YEAR - MIN_YEAR) * 100;
  const right = (end - MIN_YEAR) / (MAX_YEAR - MIN_YEAR) * 100;
  const thumbClass = 'pointer-events-none absolute inset-0 m-0 h-8 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background focus-visible:outline-2 focus-visible:outline-primary';
  return <div className="space-y-3">
    <p className="text-xs text-text-muted">Año de estreno · {start}–{end}</p>
    <div className="relative mx-2 h-8">
      <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-primary/15" />
      <div className="absolute top-3.5 h-1 rounded-full bg-primary" style={{ left: `${left}%`, width: `${right - left}%` }} />
      <input type="range" aria-label="Año desde" min={MIN_YEAR} max={MAX_YEAR} value={start} style={{ zIndex: start === MAX_YEAR ? 2 : 1 }} className={thumbClass} onChange={(event) => { const value = Math.min(Number(event.target.value), end); setStart(value); setStartText(String(value)); }} onPointerUp={() => apply()} onKeyUp={() => apply()} />
      <input type="range" aria-label="Año hasta" min={MIN_YEAR} max={MAX_YEAR} value={end} style={{ zIndex: start === MIN_YEAR ? 2 : 0 }} className={thumbClass} onChange={(event) => { const value = Math.max(Number(event.target.value), start); setEnd(value); setEndText(String(value)); }} onPointerUp={() => apply()} onKeyUp={() => apply()} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1 text-xs text-text-muted">Desde<input type="number" aria-label="Desde el año" min={MIN_YEAR} max={end} value={startText} onChange={(event) => setStartText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={() => { const value = Math.min(clamp(Number(startText) || MIN_YEAR), end); setStart(value); setStartText(String(value)); apply(value, end); }} className="h-9 w-full rounded-lg border border-primary/15 bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" /></label>
      <label className="space-y-1 text-xs text-text-muted">Hasta<input type="number" aria-label="Hasta el año" min={start} max={MAX_YEAR} value={endText} onChange={(event) => setEndText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={() => { const value = Math.max(clamp(Number(endText) || MAX_YEAR), start); setEnd(value); setEndText(String(value)); apply(start, value); }} className="h-9 w-full rounded-lg border border-primary/15 bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40" /></label>
    </div>
  </div>;
}
