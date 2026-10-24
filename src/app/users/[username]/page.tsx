import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProfileHighlights from '@/components/profile/ProfileHighlights';
import PublicFavoritesGrid from '@/components/friends/PublicFavoritesGrid';
import RelationshipButton from '@/components/friends/RelationshipButton';
import { getSocialProfile, getVisibleFavorites, getVisibleHighlights } from '@/services/social';
import { DEFAULT_PROFILE_AVATAR, getProfileAvatar, profileAvatarBackground } from '@/lib/profile-avatar';

export default async function SocialProfilePage({ params }: Readonly<{ params: Promise<{ username: string }> }>) {
  const { username } = await params;
  const profile = await getSocialProfile(decodeURIComponent(username));
  if (!profile) notFound();
  if (profile.relationship === 'self') {
    return <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8"><div className="rounded-3xl border border-border bg-card p-10 text-center"><p className="text-muted-foreground">Este es tu perfil.</p><Link href="/profile" className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Ir a mi perfil</Link></div></main>;
  }

  const [highlights, favoritesResult] = await Promise.all([
    getVisibleHighlights(profile.id),
    profile.can_view_library ? getVisibleFavorites(profile.id, 1, 10) : Promise.resolve({ items: [], total: 0, totalPages: 0 }),
  ]);
  const avatar = getProfileAvatar(profile.avatar) ?? DEFAULT_PROFILE_AVATAR;

  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <section className="mb-12 flex flex-col items-center gap-6 rounded-4xl border border-border bg-card p-7 text-center sm:flex-row sm:text-left">
      <div role="img" aria-label={`Imagen de perfil de ${profile.full_name || profile.username}`} className="size-28 shrink-0 rounded-3xl bg-primary/15 bg-cover bg-center" style={{ backgroundImage: profileAvatarBackground(avatar) }} />
      <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Perfil de AniTrack</p><h1 className="mt-1 truncate text-3xl font-black sm:text-5xl">{profile.full_name || profile.username}</h1><p className="mt-1 text-sm font-semibold text-muted-foreground">@{profile.username}</p>{profile.bio && <p className="mt-4 max-w-2xl text-muted-foreground">{profile.bio}</p>}</div>
      <RelationshipButton profile={profile} />
    </section>

    <div className="space-y-14">
      {(profile.can_view_featured_anime || profile.can_view_featured_manga || profile.can_view_featured_characters) ? <ProfileHighlights items={highlights} /> : <PrivateSection title="Favoritos destacados" />}
      <section><div className="mb-6 flex items-end justify-between gap-3"><div><h2 className="text-2xl font-black">Biblioteca de favoritos</h2><p className="mt-1 text-sm text-muted-foreground">{profile.can_view_library ? `${favoritesResult.total} títulos guardados` : 'Esta sección no es pública.'}</p></div>{profile.can_view_library && favoritesResult.total > 10 && <Link href={`/users/${profile.username}/favorites`} className="text-sm font-bold text-primary">Ver todo</Link>}</div>{!profile.can_view_library ? <PrivateSection title="Biblioteca privada" compact /> : favoritesResult.items.length ? <PublicFavoritesGrid items={favoritesResult.items as never[]} /> : <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Esta persona todavía no agregó favoritos.</div>}</section>
    </div>
  </main>;
}

function PrivateSection({ title, compact }: Readonly<{ title: string; compact?: boolean }>) {
  return <div className={`rounded-3xl border border-dashed border-border bg-card/40 text-center ${compact ? 'p-10' : 'p-16'}`}><span className="material-symbols-outlined text-4xl text-muted-foreground">lock</span><h2 className="mt-2 font-black">{title}</h2><p className="mt-1 text-sm text-muted-foreground">Sólo puede verla el propietario o las personas autorizadas.</p></div>;
}
