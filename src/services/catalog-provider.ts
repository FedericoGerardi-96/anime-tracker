import 'server-only';
import { cookies } from 'next/headers';
import { CATALOG_PROVIDER_COOKIE } from '@/lib/catalog-provider';
import type { CatalogProvider } from '@/interfaces/anilist-catalog';

export async function getCatalogProvider(): Promise<CatalogProvider> {
  return (await cookies()).get(CATALOG_PROVIDER_COOKIE)?.value === 'myanimelist' ? 'myanimelist' : 'anilist';
}
