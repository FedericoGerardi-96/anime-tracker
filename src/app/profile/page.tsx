import { createClient } from "@/lib/supabase/server";
import { Metadata } from 'next';
import Link from "next/link";
import HContentToggle from "@/components/profile/HContentToggle";
import MalConnectionCard from "@/components/profile/MalConnectionCard";
import AniListConnectionCard from "@/components/profile/AniListConnectionCard";
import { getAniListConnectionStatus } from "@/services/anilist-connection";
import ProfileHighlights from "@/components/profile/ProfileHighlights";
import PrivacySettings from "@/components/profile/PrivacySettings";
import SocialProfileSettings from "@/components/profile/SocialProfileSettings";
import ProfileAvatarPicker from "@/components/profile/ProfileAvatarPicker";
import { getFavoritesWithMedia } from "@/lib/actions/media";
import { getMediaByProgressStatus, getProgressStats } from "@/lib/actions/lists";
import { slugify } from "@/lib/utils";
import { getMalConnectionStatus } from "@/services/myanimelist-connection";
import { getProfileAvatarOptions } from "@/services/profile-avatars";
import type { ProfileHighlight } from "@/types/profile-highlights";
import type { ProfilePrivacy } from "@/types/social";
import { DEFAULT_PROFILE_AVATAR, getProfileAvatar } from "@/lib/profile-avatar";

export const metadata: Metadata = {
  title: "Mi perfil",
  description: "Consultá tus estadísticas de anime y manga, administrá tus listas y personalizá tu perfil.",
};

interface ProfilePageProps {
  searchParams: Promise<{ mal?: string; missing?: string; anilist?: string; anilistMissing?: string }>;
}

export default async function ProfilePage({ searchParams }: Readonly<ProfilePageProps>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = {
    name: "Usuario",
    avatar: DEFAULT_PROFILE_AVATAR,
    tier: "MEMBER",
    bio: "¡Soy nuevo por acá! Explorando el mundo del anime.",
    verified: false,
    show_h_content: false,
    username: "",
    discoverable: true,
    allow_friend_requests: true,
  };

  if (user) {
    profile.name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Usuario";
    profile.avatar = getProfileAvatar(user.user_metadata?.avatar_url) ?? profile.avatar;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      const rol = data.roles?.includes('supporter') ? 'SUPPORTER' : 'MEMBER';
      profile.name = data.full_name || profile.name;
      profile.avatar = getProfileAvatar(data.avatar) ?? profile.avatar;
      profile.tier = data.roles?.includes('admin') ? 'ADMIN' : rol;
      profile.verified = true;
      profile.show_h_content = data.show_h_content ?? false;
      profile.username = data.username || "";
      profile.bio = data.bio || profile.bio;
      profile.discoverable = data.discoverable ?? true;
      profile.allow_friend_requests = data.allow_friend_requests ?? true;
    }
  }

  const [favorites, watchingRaw, stats, highlightsResult, privacyResult, avatarOptions] = await Promise.all([
    getFavoritesWithMedia(),
    getMediaByProgressStatus('watching'),
    getProgressStats(),
    user
      ? supabase.from('profile_highlights').select('id, category, external_id, title, subtitle, image_url, position, provider, characters(anilist_id, mal_id)').eq('user_id', user.id).order('position')
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('profile_privacy').select('library_favorites_visibility, featured_anime_visibility, featured_manga_visibility, featured_characters_visibility').eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    user ? getProfileAvatarOptions() : Promise.resolve([]),
  ]);
  const highlights = (highlightsResult.data ?? []).map((item) => {
    const identity = Array.isArray(item.characters) ? item.characters[0] : item.characters;
    return { ...item, characters: undefined, anilist_id: identity?.anilist_id ?? null, mal_id: identity?.mal_id ?? null };
  }) as ProfileHighlight[];
  const privacy = (privacyResult.data ?? {
    library_favorites_visibility: 'private', featured_anime_visibility: 'public',
    featured_manga_visibility: 'public', featured_characters_visibility: 'public',
  }) as ProfilePrivacy;
  const malConnection = user
    ? await getMalConnectionStatus(user.id)
    : { connected: false };
  const anilistConnection = user ? await getAniListConnectionStatus(user.id) : { connected: false };

  const watching = watchingRaw as unknown as Array<{
    id: string;
    status: string;
    current_episode: number;
    media: { id: string; mal_id: number; title: string; image: string; type: string; } | null;
  }>;

  const statCards = stats
    ? [
        { label: "En curso", value: String(stats.watching), color: "text-primary" },
        { label: "Completados", value: String(stats.completed), color: "text-primary" },
      ]
    : [
        { label: "En curso", value: "0", color: "text-primary" },
        { label: "Completados", value: "0", color: "text-primary" },
      ];

  return (
    <div className="flex-1 p-6 md:p-12 space-y-12">
      {/* Profile Header */}
      <section className="pt-12 xl:pt-0">
        <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-end">
          <ProfileAvatarPicker avatar={profile.avatar} options={avatarOptions} verified={profile.verified} profileName={profile.name} editable={Boolean(user)} />

          <div className="flex-1 text-center xl:text-left space-y-2 min-w-[280px]">
            <div className="flex flex-col xl:flex-row items-center gap-4">
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-text-primary">{profile.name}</h1>
              <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] lg:text-xs font-bold rounded-full uppercase tracking-widest whitespace-nowrap">
                {profile.tier}
              </span>
            </div>
            <p className="text-text-muted text-sm lg:text-base max-w-lg mx-auto xl:mx-0">
              {profile.bio}
            </p>
            {profile.username && <Link href={`/users/${profile.username}`} className="inline-block text-sm font-semibold text-primary hover:underline">@{profile.username}</Link>}
          </div>

          <div className="flex flex-wrap justify-center xl:justify-end gap-3 lg:gap-4 shrink-0">
            {statCards.map((stat) => (
              <div key={stat.label} className="glass-card px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-center min-w-[100px] lg:min-w-[120px]">
                <p className={`text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] lg:text-[10px] uppercase text-text-muted font-semibold tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProfileHighlights items={highlights} editable={Boolean(user)} />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div>
          {/* Currently Watching */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">play_circle</span>{''}
                Viendo / Leyendo
              </h2>
              <Link href="/lists" className="text-primary text-sm font-semibold hover:underline">
                Ver mis listas
              </Link>
            </div>

            {watching.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 block">tv_off</span>
                <p className="text-sm text-text-muted">Todavía no tenés títulos en curso.</p>
                <Link href="/anime" className="inline-block mt-4 text-primary text-sm font-semibold hover:underline">
                  Explorar anime
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-5">
                {watching.map((item) => {
                  if (!item.media) return null;
                  const slug = `${item.media.mal_id}-${slugify(item.media.title)}`;
                  return (
                    <Link key={item.id} href={`/${item.media.type === "manga" ? "manga" : "anime"}/${slug}`} className="group min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                      <div className="glass-card h-full overflow-hidden rounded-2xl transition-colors group-hover:border-primary/40">
                        <div className="relative aspect-2/3 overflow-hidden">
                          <div
                            className="h-full w-full bg-cover bg-center transition-transform duration-300 motion-safe:group-hover:scale-105"
                            style={{ backgroundImage: `url('${item.media.image}')` }}
                          />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase">
                            {item.media.type === "manga" ? "Cap." : "Ep."} {item.current_episode ?? 0}
                          </div>
                        </div>
                        <div className="space-y-2 p-3">
                          <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-text-primary" title={item.media.title}>{item.media.title}</h3>
                          <p className="flex items-center gap-1.5 text-xs text-text-muted"><span className="size-1.5 shrink-0 rounded-full bg-primary" />{item.media.type === "manga" ? "Leyendo" : "Viendo"}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Biblioteca de favoritos */}
        <div>
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">grade</span>{''}
                Favoritos
              </h2>
            </div>

            {favorites.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 block">favorite_border</span>
                <p className="text-sm text-text-muted">Todavía no agregaste favoritos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-4">
                {favorites?.slice(0, 8).map((fav) => {
                  const slug = `${fav.mal_id}-${slugify(fav.title)}`;
                  return (
                    <Link key={fav.id} href={`/anime/${slug}`}>
                      <div className="relative group rounded-xl overflow-hidden aspect-2/3 cursor-pointer">
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('${fav.image}')` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 flex flex-col justify-end p-3">
                          <h3 className="text-xs font-bold text-white truncate">{fav.title}</h3>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link href="/favorites" className="block w-full mt-6 py-4 glass-card rounded-2xl text-center text-sm font-bold text-text-muted hover:text-primary transition-colors border-dashed hover:border-primary/50 cursor-pointer">
                Ver todos mis favoritos
            </Link>
          </section>
        </div>
      </div>

      {/* Settings */}
      {user && (
        <section className="space-y-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-text-primary mb-6">
            <span className="material-symbols-outlined text-primary">tune</span>{''}
            Preferencias
          </h2>
          <div className="max-w-lg">
            <HContentToggle enabled={profile.show_h_content} />
          </div>
          <SocialProfileSettings username={profile.username} bio={profile.bio} discoverable={profile.discoverable} allowFriendRequests={profile.allow_friend_requests} />
          <PrivacySettings initialSettings={privacy} />
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-muted">Cuentas conectadas</h3>
            <MalConnectionCard
              connection={malConnection}
              result={query.mal}
              missingConfiguration={query.missing}
            />
            <AniListConnectionCard connection={anilistConnection} result={query.anilist} missing={query.anilistMissing} />
          </div>
        </section>
      )}
    </div>
  );
}
