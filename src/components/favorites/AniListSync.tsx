"use client";
import LibrarySyncButton from "@/components/favorites/LibrarySync";
export { LibrarySyncProvider as AniListSyncProvider } from "@/components/favorites/LibrarySync";
export default function AniListSyncButton() { return <LibrarySyncButton provider="anilist" />; }
