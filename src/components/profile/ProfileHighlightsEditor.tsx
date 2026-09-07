'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfileHighlights } from '@/lib/actions/profile-highlights';
import Loader from '@/components/ui/Loader';
import type { ProfileHighlight, ProfileHighlightCategory } from '@/types/profile-highlights';

const LABELS: Record<ProfileHighlightCategory, string> = { anime: 'Anime', manga: 'Manga', character: 'Personajes' };
const TYPES = Object.keys(LABELS) as ProfileHighlightCategory[];

export default function ProfileHighlightsEditor({ initialItems }: Readonly<{ initialItems: ProfileHighlight[] }>) {
  const router = useRouter();
  const [active, setActive] = useState<ProfileHighlightCategory>('anime');
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileHighlight[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = useMemo(() => items.filter((item) => item.category === active).sort((a, b) => a.position - b.position), [items, active]);

  useEffect(() => {
    setResults([]);
    setMessage(null);
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/profile/highlights/search?type=${active}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const payload = await response.json() as { data?: ProfileHighlight[]; error?: string };
        if (!response.ok) throw new Error(payload.error);
        setResults(payload.data ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setMessage((error as Error).message || 'No se pudo completar la búsqueda.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, active]);

  const add = (item: ProfileHighlight) => {
    if (selected.length >= 10 || selected.some((current) => current.external_id === item.external_id)) return;
    setItems((current) => [...current, { ...item, position: selected.length }]);
  };

  const remove = (externalId: number) => setItems((current) => current
    .filter((item) => !(item.category === active && item.external_id === externalId))
    .map((item) => item.category === active ? { ...item, position: current.filter((candidate) => candidate.category === active && candidate.external_id !== externalId).findIndex((candidate) => candidate.external_id === item.external_id) } : item));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const reordered = [...selected];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const rest = items.filter((item) => item.category !== active);
    setItems([...rest, ...reordered.map((item, position) => ({ ...item, position }))]);
  };

  const save = async () => {
    setSaving(true); setMessage(null);
    const normalized = TYPES.flatMap((type) => items.filter((item) => item.category === type).sort((a, b) => a.position - b.position).map((item, position) => ({ ...item, position })));
    const result = await saveProfileHighlights(normalized);
    setSaving(false);
    if (result.error) return setMessage(result.error);
    router.push('/profile');
    router.refresh();
  };

  return <div className="space-y-6">
    <div className="flex gap-2 overflow-x-auto border-b border-border pb-3">
      {TYPES.map((type) => <button key={type} type="button" onClick={() => { setActive(type); setQuery(''); }} className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition ${active === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{LABELS[type]} <span className="ml-1 opacity-70">{items.filter((item) => item.category === type).length}/10</span></button>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <label htmlFor="highlight-search" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Buscar {LABELS[active].toLowerCase()} en AniList</label>
        <div className="relative mt-3">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
          <input id="highlight-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Escribí al menos dos letras…`} className="h-12 w-full rounded-xl border border-border bg-background pl-12 pr-4 outline-none focus:border-primary" />
        </div>
        {searching && <div className="py-12"><Loader label="Buscando en AniList…" /></div>}
        {!searching && query.length >= 2 && <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {results.map((item) => {
            const added = selected.some((current) => current.external_id === item.external_id);
            return <button type="button" disabled={added || selected.length >= 10} onClick={() => add(item)} key={item.external_id} className="flex items-center gap-3 rounded-2xl border border-border p-3 text-left transition hover:border-primary/50 disabled:opacity-45">
              <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image_url && <Image src={item.image_url} alt="" fill sizes="48px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="block truncate text-muted-foreground">{item.subtitle || LABELS[active]}</small></span>
              <span className="material-symbols-outlined text-primary">{added ? 'check' : 'add_circle'}</span>
            </button>;
          })}
        </div>}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black">Mi top de {LABELS[active].toLowerCase()}</h2><p className="text-xs text-muted-foreground">El orden se reflejará en tu perfil.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{selected.length}/10</span></div>
        {selected.length === 0 ? <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">Todavía no agregaste ninguno.</div> : <ol className="space-y-2">{selected.map((item, index) => <li key={item.external_id} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2">
          <span className="w-6 text-center text-sm font-black text-primary">{index + 1}</span>
          <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">{item.image_url && <Image src={item.image_url} alt="" fill sizes="44px" className="object-cover" />}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><small className="block truncate text-muted-foreground">{item.subtitle}</small></span>
          <span className="flex flex-col"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir" className="material-symbols-outlined text-lg disabled:opacity-20">keyboard_arrow_up</button><button type="button" disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label="Bajar" className="material-symbols-outlined text-lg disabled:opacity-20">keyboard_arrow_down</button></span>
          <button type="button" onClick={() => remove(item.external_id)} aria-label={`Quitar ${item.title}`} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-400"><span className="material-symbols-outlined text-lg">close</span></button>
        </li>)}</ol>}
      </section>
    </div>
    {message && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">{message}</p>}
    <div className="sticky bottom-4 flex justify-end gap-3 rounded-2xl border border-border bg-background/90 p-4 shadow-2xl backdrop-blur-xl"><button type="button" onClick={() => router.push('/profile')} className="rounded-xl border border-border px-5 py-3 font-bold">Cancelar</button><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar destacados'}</button></div>
  </div>;
}

