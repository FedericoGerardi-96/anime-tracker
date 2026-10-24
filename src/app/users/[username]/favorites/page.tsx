import Link from 'next/link';
import { Suspense } from 'react';
import Pagination from '@/components/ui/Pagination';
import { notFound } from 'next/navigation';
import PublicFavoritesGrid from '@/components/friends/PublicFavoritesGrid';
import { getSocialProfile, getVisibleFavorites } from '@/services/social';

export default async function FriendFavoritesPage({ params, searchParams }: Readonly<{ params: Promise<{ username: string }>; searchParams: Promise<{ page?: string }> }>) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const profile = await getSocialProfile(decodeURIComponent(username));
  if (!profile) notFound();
  const page = Math.max(1, Number(query.page) || 1);
  const result = profile.can_view_library ? await getVisibleFavorites(profile.id, page, 20) : { items: [], total: 0, totalPages: 0 };

  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <nav className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground"><Link href={`/users/${profile.username}`}>@{profile.username}</Link><span>›</span><span className="text-primary">Favoritos</span></nav>
    <div className="mb-8"><h1 className="text-4xl font-black sm:text-6xl">Sus favoritos</h1><p className="mt-2 text-muted-foreground">{profile.can_view_library ? `${result.total} anime y manga` : 'Esta biblioteca es privada.'}</p></div>
    {!profile.can_view_library ? <div className="rounded-3xl border border-dashed border-border p-16 text-center"><span className="material-symbols-outlined text-5xl text-muted-foreground">lock</span><p className="mt-3 text-muted-foreground">No tenés permiso para ver esta sección.</p></div> : <><PublicFavoritesGrid items={result.items as never[]} /><Suspense fallback={null}><Pagination currentPage={page} totalPages={result.totalPages} /></Suspense></>}
  </main>;
}
