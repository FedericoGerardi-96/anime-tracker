import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/navigation/BackButton";
import { getCharacterById } from "@/services/anilist-characters";
import { slugify } from "@/lib/utils";
import TranslatedCharacterDescription from '@/components/anime/TranslatedCharacterDescription';
import { getAuthenticatedUser } from '@/services/supabase';

export default async function CharacterPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const id = Number(slug.match(/^(\d+)/)?.[1]);
  if (!id) notFound();
  let character;
  try { character = await getCharacterById(id); } catch { notFound(); }
  const user = await getAuthenticatedUser();

  return <main className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
    <nav className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/">Inicio</Link><span>›</span><BackButton label="Personajes" fallback="/characters"/><span>›</span><span className="truncate text-foreground">{character.name}</span></nav>
    <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside><div className="sticky top-24 rounded-4xl border border-border bg-card p-6 shadow-2xl"><div className="relative aspect-3/4 overflow-hidden rounded-3xl"><img src={character.image} alt={character.name} className="size-full object-cover"/><div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent"/><div className="absolute inset-x-0 bottom-0 p-6 text-white"><h1 className="text-3xl font-black">{character.name}</h1><p className="mt-1 text-xs font-bold text-primary">{character.nativeName}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted/60 p-3"><span className="block text-[9px] uppercase text-muted-foreground">Favoritos</span><strong>{character.favorites.toLocaleString("es-AR")}</strong></div><div className="rounded-xl bg-muted/60 p-3"><span className="block text-[9px] uppercase text-muted-foreground">Edad</span><strong>{character.age || "—"}</strong></div></div><a href={character.url} target="_blank" rel="noreferrer" className="mt-5 block rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold uppercase text-primary-foreground">Ver en AniList</a></div></aside>
      <div className="space-y-12"><section><h2 className="mb-5 text-lg font-black uppercase tracking-widest text-primary">Biografía</h2><div className="rounded-4xl border border-border bg-card p-7 sm:p-10"><TranslatedCharacterDescription anilistId={character.id} original={character.description} canSave={Boolean(user)} emptyMessage="Todavía no hay información biográfica disponible." /></div></section>
      {character.voiceActors.length > 0 && <section><h2 className="mb-5 text-lg font-black uppercase tracking-widest text-primary">Seiyūs</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{character.voiceActors.map((actor) => <a key={actor.id} href={actor.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/40"><img src={actor.image} alt={actor.name} className="size-14 rounded-full object-cover"/><div className="min-w-0"><p className="truncate font-bold">{actor.name}</p><p className="text-xs text-muted-foreground">{actor.language}</p></div></a>)}</div></section>}
      {character.appearances.length > 0 && <section><h2 className="mb-5 text-lg font-black uppercase tracking-widest text-primary">Apariciones</h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">{character.appearances.map((media) => <Link key={`${media.type}-${media.malId}`} href={`/${media.type.toLowerCase()}/${media.malId}-${slugify(media.title)}`} className="group"><div className="aspect-2/3 overflow-hidden rounded-2xl border border-border"><img src={media.image} alt={media.title} className="size-full object-cover transition group-hover:scale-105"/></div><p className="mt-2 truncate text-sm font-bold group-hover:text-primary">{media.title}</p></Link>)}</div></section>}</div>
    </div>
  </main>;
}
