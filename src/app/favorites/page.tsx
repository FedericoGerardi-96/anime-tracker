import { redirect } from 'next/navigation';
import type { CatalogPageProps } from '@/interfaces/page';

// Preserve old bookmarks, filters and OAuth feedback without changing saved data.
export default async function FavoritesPage({ searchParams }: Readonly<CatalogPageProps>) {
  const params = await searchParams;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') query.set(key, value);
    else if (Array.isArray(value)) value.forEach(item => query.append(key, item));
  });
  query.set('tab', 'library');
  query.delete('list');
  redirect('/lists?' + query.toString());
}
