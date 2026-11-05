import type { CatalogAnime } from "@/interfaces/media-catalog";

export interface HomeAnimePosterProps { anime: CatalogAnime }
export interface HomeSectionUnavailableProps { title: string }
export interface HomeSectionSkeletonProps {
  section: "today" | "watching" | "upcoming" | "recommendations" | "stats" | "top";
}
