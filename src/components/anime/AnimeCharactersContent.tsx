import Link from "next/link";
import {
  CharacterProviderUnavailableError,
  getAnimeCharactersPage,
} from "@/services/anilist-characters";
import Pagination from "@/components/ui/Pagination";
import CharactersClient from "./CharactersClient";
export default async function AnimeCharactersContent({
  slug, page = 1,
}: Readonly<{ slug: string; page?: number }>) {
  const animeId = Number.parseInt(slug.split("-")[0]);
  let data;
  try {
    data = await getAnimeCharactersPage(animeId, page);
  } catch (error) {
    if (!(error instanceof CharacterProviderUnavailableError)) throw error;
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <span className="material-symbols-outlined mb-4 text-5xl text-amber-500">
          cloud_off
        </span>
        <h2 className="text-2xl font-black">
          No pudimos cargar los personajes
        </h2>
        <p className="mt-2 text-muted-foreground">
          AniList no está disponible y el reparto de este anime todavía no fue
          guardado en AniTrack. Probá nuevamente más tarde.
        </p>
        <Link
          href={`/anime/${slug}`}
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Volver al anime
        </Link>
      </section>
    );
  }

  return <>
    <CharactersClient key={page} initialCharacters={data.characters} />
    {data.characters.length === 0 && <p className="py-8 text-center">No hay personajes en esta página.</p>}
    <Pagination currentPage={page} hasNextPage={data.hasNextPage} showBoundaryPages={false} />
  </>;
}
