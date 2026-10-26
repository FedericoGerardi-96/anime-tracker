import Link from "next/link";
import Image from "next/image";
import { slugify } from "@/lib/utils";
import { getAnimeCharacterPreview } from "@/services/anilist-characters";
import type { MediaSectionProps } from "@/interfaces/media-detail-components";
export default async function AnimeDetailCharacters({
  malId,
  slug,
}: Readonly<MediaSectionProps>) {
  const mainCharacters = await getAnimeCharacterPreview(malId).catch(() => []);
  return (
    <>
      {mainCharacters.length > 0 && (
        <section className="mt-20">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-text-primary">
                Personajes principales
              </h2>
            </div>
            <Link
              href={`/anime/${slug}/characters`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos{" "}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {mainCharacters.map((character) => (
              <Link
                href={`/characters/${character.provider === "myanimelist" ? `mal-${character.malId ?? character.id}` : character.id}-${slugify(character.name)}`}
                key={`${character.provider}-${character.id}`}
                className="flex flex-col items-center rounded-2xl p-3 text-center transition hover:scale-105"
              >
                <Image width={96} height={96} sizes="96px"
                  className="mb-3 size-24 rounded-full border-2 border-primary/20 object-cover shadow-lg"
                  src={character.image || "/placeholder-cover.svg"}
                  alt={character.name}
                />
                <p className="w-full truncate text-sm font-bold text-text-primary">
                  {character.name}
                </p>
                <p className="text-[10px] uppercase tracking-tighter text-text-muted">
                  Principal
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
