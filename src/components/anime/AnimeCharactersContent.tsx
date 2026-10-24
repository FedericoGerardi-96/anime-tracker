import Link from "next/link";
import { getMalAnimeById } from "@/lib/myanimelist-service";
import {
  CharacterProviderUnavailableError,
  getAnimeCharacters,
} from "@/services/anilist-characters";
import { getAuthenticatedUser } from "@/services/supabase";
import type { DetailContentProps } from "@/interfaces/page";
import CharactersClient from "./CharactersClient";
export default async function AnimeCharactersContent({
  slug,
}: Readonly<DetailContentProps>) {
  const animeId = Number.parseInt(slug.split("-")[0]);
  let data;
  try {
    data = await Promise.all([
      getMalAnimeById(animeId),
      getAuthenticatedUser(),
      getAnimeCharacters(animeId),
    ]);
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

  const [anime, user, characters] = data;
  return (
    <CharactersClient
      initialCharacters={characters}
      animeTitle={anime.title_english || anime.title}
      canSaveTranslations={Boolean(user)}
    />
  );
}
