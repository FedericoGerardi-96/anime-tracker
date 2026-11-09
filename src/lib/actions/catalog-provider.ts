"use server";

import { cookies } from 'next/headers';
import { CATALOG_PROVIDER_COOKIE } from '@/lib/catalog-provider';

type SaveResult = { error: boolean; message: string } | null;

export async function saveCatalogProvider(_previous: SaveResult, formData: FormData): Promise<SaveResult> {
  const provider = formData.get('provider');
  if (provider !== 'anilist' && provider !== 'myanimelist') {
    return { error: true, message: 'Elegí AniList o MyAnimeList.' };
  }

  (await cookies()).set(CATALOG_PROVIDER_COOKIE, provider, {
    path: '/',
    maxAge: 31536000,
    sameSite: 'lax',
  });
  const name = provider === 'anilist' ? 'AniList' : 'MyAnimeList';
  return { error: false, message: `${name} quedó guardado como fuente de búsqueda.` };
}
