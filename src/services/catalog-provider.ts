import 'server-only';
import { cookies } from 'next/headers';
import type { CatalogProvider } from '@/interfaces/anilist-catalog';

export async function getCatalogProvider(): Promise<CatalogProvider> {
  return (await cookies()).get('catalog-provider')?.value === 'myanimelist' ? 'myanimelist' : 'anilist';
}
