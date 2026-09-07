import type { Metadata } from "next";
import Link from "next/link";
import { searchCharacters } from "@/services/anilist-characters";
import { slugify } from "@/lib/utils";

export const metadata: Metadata = { title: "Personajes | AniTrack", description: "Buscá personajes de anime y manga." };

export default async function CharactersPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string; page?: string }> }>) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  let result = { characters: [], hasNextPage: false } as Awaited<ReturnType<typeof searchCharacters>>;
  let unavailable = false;
  if (query.length >= 2) {
    try { result = await searchCharacters(query, page); } catch { unavailable = true; }
  }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Directorio de AniList</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">Personajes</h1><p className="mt-3 text-muted-foreground">Buscá personajes por nombre y explorá sus perfiles, apariciones y seiyūs.</p></div>
    <form className="mb-10 flex max-w-2xl gap-3" action="/characters"><input name="q" defaultValue={query} minLength={2} required placeholder="Ej.: Hinata Hyuuga" className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 outline-none focus:border-primary"/><button className="rounded-xl bg-primary px-6 font-bold text-primary-foreground">Buscar</button></form>
    {unavailable && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6"><h2 className="font-bold">La búsqueda de personajes no está disponible</h2><p className="mt-1 text-sm text-muted-foreground">AniList no está respondiendo. Probá nuevamente más tarde.</p></div>}
    {!unavailable && query && result.characters.length === 0 && <p className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No encontramos personajes para “{query}”.</p>}
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{result.characters.map((character) => <Link key={character.id} href={`/characters/${character.id}-${slugify(character.name)}`} className="group overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-3/4 overflow-hidden"><img src={character.image} alt={character.name} className="size-full object-cover transition duration-500 group-hover:scale-105"/></div><div className="p-4"><h2 className="truncate font-bold group-hover:text-primary">{character.name}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{character.nativeName || `${character.favorites.toLocaleString("es-AR")} favoritos`}</p></div></Link>)}</div>
    {(page > 1 || result.hasNextPage) && <nav className="mt-10 flex justify-center gap-3">{page > 1 && <Link href={`/characters?q=${encodeURIComponent(query)}&page=${page - 1}`} className="rounded-xl border border-border px-5 py-2 font-semibold">Anterior</Link>}{result.hasNextPage && <Link href={`/characters?q=${encodeURIComponent(query)}&page=${page + 1}`} className="rounded-xl bg-primary px-5 py-2 font-semibold text-primary-foreground">Siguiente</Link>}</nav>}
  </main>;
}
