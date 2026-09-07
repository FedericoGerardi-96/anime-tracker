export type CatalogMediaType = "anime" | "manga";

const ANIME_STATUS_LABELS: Readonly<Record<string, string>> = {
  finished_airing: "Emisión finalizada",
  currently_airing: "En emisión",
  not_yet_aired: "Próximamente",
};

const MANGA_STATUS_LABELS: Readonly<Record<string, string>> = {
  finished: "Publicación finalizada",
  currently_publishing: "En publicación",
  not_yet_published: "Próximamente",
  on_hiatus: "En pausa",
  discontinued: "Descontinuado",
};

function humanizeUnknownStatus(status: string) {
  const words = status.replaceAll("_", " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Sin información";
}

export function getCatalogStatusLabel(status: string | null | undefined, mediaType: CatalogMediaType) {
  if (!status) return "Sin información";
  const dictionary = mediaType === "anime" ? ANIME_STATUS_LABELS : MANGA_STATUS_LABELS;
  return dictionary[status] ?? humanizeUnknownStatus(status);
}
