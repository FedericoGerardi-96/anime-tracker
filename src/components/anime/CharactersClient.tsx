"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnimeCharacter } from "@/interfaces/character";
import { slugify } from "@/lib/utils";
import TranslatedCharacterDescription from '@/components/anime/TranslatedCharacterDescription';

const ROLE_LABELS = { MAIN: "Principal", SUPPORTING: "Secundario", BACKGROUND: "De fondo" } as const;

export default function CharactersClient({ initialCharacters, canSaveTranslations }: Readonly<{ initialCharacters: AnimeCharacter[]; animeTitle: string; canSaveTranslations: boolean }>) {
  const [selected, setSelected] = useState<AnimeCharacter | null>(initialCharacters[0] ?? null);
  const voiceActor = selected?.voiceActors[0];

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {initialCharacters.map((character) => (
            <button key={character.id} type="button" onClick={() => setSelected(character)} className={`group relative overflow-hidden rounded-2xl border-2 bg-card text-left transition hover:scale-[1.02] ${selected?.id === character.id ? "border-primary shadow-2xl shadow-primary/20" : "border-border hover:border-primary/50"}`}>
              <div className="relative aspect-3/4">
                <img className={`size-full object-cover transition duration-500 group-hover:scale-105 group-hover:grayscale-0 ${selected?.id === character.id ? "grayscale-0" : "grayscale"}`} src={character.image} alt={character.name} />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-transparent to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className={`mb-1 block w-fit rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] ${character.role === "MAIN" ? "bg-primary text-white" : "bg-black/60 text-slate-200"}`}>{ROLE_LABELS[character.role]}</span>
                <h3 className="truncate text-sm font-bold text-white md:text-base">{character.name}</h3>
              </div>
            </button>
          ))}
        </div>
      </div>

      <aside className="xl:col-span-4">
        {selected && <div className="sticky top-24 overflow-hidden rounded-4xl border border-border bg-card p-7 shadow-2xl">
          <div className="mb-6 flex items-center gap-4">
            <img className="size-20 shrink-0 rounded-2xl border-2 border-primary object-cover" src={selected.image} alt={selected.name} />
            <div className="min-w-0"><h2 className="text-2xl font-black">{selected.name}</h2><p className="truncate text-xs font-bold uppercase tracking-widest text-primary">{ROLE_LABELS[selected.role]}{selected.nativeName ? ` · ${selected.nativeName}` : ""}</p></div>
          </div>
          <h4 className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Perfil del personaje</h4>
          <div className="max-h-64 overflow-y-auto pr-2"><TranslatedCharacterDescription anilistId={selected.id} original={selected.description} canSave={canSaveTranslations} /></div>
          {voiceActor && <div className="mt-6 flex items-center gap-4 rounded-2xl border border-border bg-muted/50 p-4">
            <img className="size-12 rounded-full object-cover" src={voiceActor.image} alt={voiceActor.name} />
            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seiyū japonés</p><p className="truncate text-sm font-bold">{voiceActor.name}</p></div>
            <a href={voiceActor.url} target="_blank" rel="noreferrer" aria-label={`Ver perfil de ${voiceActor.name}`} className="material-symbols-outlined text-muted-foreground hover:text-primary">open_in_new</a>
          </div>}
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/50 p-3"><span className="block text-[9px] font-black uppercase text-muted-foreground">Favoritos</span><strong>{selected.favorites.toLocaleString("es-AR")}</strong></div><div className="rounded-xl bg-muted/50 p-3"><span className="block text-[9px] font-black uppercase text-muted-foreground">Edad</span><strong>{selected.age || "—"}</strong></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link href={`/characters/${selected.id}-${slugify(selected.name)}`} className="rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-primary-foreground">Ver perfil completo</Link>
            <a href={selected.url} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-4 py-3 text-center text-xs font-bold uppercase tracking-wider hover:bg-muted">Ver en AniList</a>
          </div>
        </div>}
      </aside>
    </div>
  );
}
