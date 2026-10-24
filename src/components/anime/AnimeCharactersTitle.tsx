import { getMalAnimeById } from "@/lib/myanimelist-service";
import type { DetailContentProps } from "@/interfaces/page";
export default async function AnimeCharactersTitle({
  slug,
}: Readonly<DetailContentProps>) {
  const anime = await getMalAnimeById(Number.parseInt(slug.split("-")[0]));
  return <>{anime.title_english || anime.title}</>;
}
