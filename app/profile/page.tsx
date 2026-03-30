import { createClient } from "@/lib/supabase/server";
import { Metadata } from 'next';
import Link from "next/link";
import HContentToggle from "@/components/profile/HContentToggle";
import { getFavoritesWithMedia } from "@/lib/actions/media";
import { getMediaByProgressStatus, getProgressStats } from "@/lib/actions/lists";
import { slugify } from "@/lib/utils";

export const metadata: Metadata = {
  title: "User Profile",
  description: "View your personal anime and manga stats, manage your lists, and customize your profile.",
};

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: "Watched",
    title: "Solo Leveling",
    detail: "Episode 12 • Final",
    time: "2 hours ago",
    score: 9.5,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAMdvcq21ebQg7iVf9V5KhORCQcsZNHi7itdwMSIvtQxPEWIhLX_0YuVZVbXuVMnsUblrpwyt28msqXfsHMwoSFiGfZNc7vkxegM34zY-ge4AeKq6xFx2cDqs4YEfH1cjbAqSB1bwihzL9YS3XNECjvuEN6Jur5n_kVns9OhVhR47CSnpL0KU8gohVznCuZmQPoo8nGrtQqtgbZict57_Nnhhx_HcJQMHABt2NVLYjNKi5NGUdU_lfH-Hz4laKIy36e38yLi6EPXs"
  },
  {
    id: 2,
    type: "Read",
    title: "Jujutsu Kaisen",
    detail: "Chapter 254 • Cursed Tech",
    time: "Yesterday",
    increment: "+1",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBdLpXFwnigwJqFQ9qXv3eC66vzKzZ1jJpk-iOcJ6_1eTmhpcmTLWBUZA_I8ME7k3zlvBrJYWbEjvNAT_TNGb3sWG06wAhUIwz8bKeJm0oxFe6pjc6_4MmR0-YvmkXBB2Z6ly_8gnFDxO_yauxYxU5YGV1wuKLLCJoMDqcS0ceahix9X4NZMThjI07YZlUJyCkgdvuaaKPLr8yQi60P6Cbht6SMu1JpzALF6QzO2p20Hx7R_74vzkpZxULtycHXyQ6SXCqqLrCLFqE"
  }
];

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = {
    name: "Unknown User",
    avatar: "https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png",
    tier: "MEMBER",
    bio: "I'm new here! Exploring the world of anime.",
    verified: false,
    show_h_content: false,
  };

  if (user) {
    profile.name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Unknown User";
    profile.avatar = user.user_metadata?.avatar_url || profile.avatar;

    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      profile.name = data.full_name || profile.name;
      profile.avatar = data.avatar || profile.avatar;
      profile.tier = data.roles?.includes('admin') ? 'ADMIN' : (data.roles?.includes('supporter') ? 'SUPPORTER' : 'MEMBER');
      profile.verified = true;
      profile.show_h_content = data.show_h_content ?? false;
    }
  }

  const [favorites, watchingRaw, stats] = await Promise.all([
    getFavoritesWithMedia(),
    getMediaByProgressStatus('watching'),
    getProgressStats(),
  ]);

  const watching = watchingRaw as unknown as Array<{
    id: string;
    status: string;
    current_episode: number;
    media: { id: string; mal_id: number; title: string; image: string; type: string; } | null;
  }>;

  const statCards = stats
    ? [
        { label: "Watching", value: String(stats.watching), color: "text-primary" },
        { label: "Completed", value: String(stats.completed), color: "text-primary" },
      ]
    : [
        { label: "Watching", value: "0", color: "text-primary" },
        { label: "Completed", value: "0", color: "text-primary" },
      ];

  return (
    <div className="flex-1 p-6 md:p-12 space-y-12 pt-24 lg:pt-28">
      {/* Profile Header */}
      <section>
        <div className="flex flex-col xl:flex-row gap-8 items-center xl:items-end">
          <div className="relative">
            <div
              className="w-40 h-40 rounded-3xl bg-cover bg-center shadow-2xl border-2 border-slate-200 dark:border-slate-800"
              style={{ backgroundImage: `url('${profile.avatar}')` }}
            />
            {profile.verified && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
            )}
          </div>

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
          </div>

          <div className="flex flex-wrap justify-center xl:justify-end gap-3 lg:gap-4 shrink-0">
            {statCards.map((stat, index) => (
              <div key={index} className="glass-card px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-center min-w-[100px] lg:min-w-[120px]">
                <p className={`text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] lg:text-[10px] uppercase text-text-muted font-semibold tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Activity & Watching */}
        <div className="col-span-12 xl:col-span-8 space-y-12">
          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">history</span>
                Recent Activity
              </h3>
              <button className="text-primary text-sm font-semibold hover:underline cursor-pointer">View All</button>
            </div>

            <div className="space-y-4">
              {RECENT_ACTIVITY.map((activity) => (
                <div key={activity.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 group hover:bg-primary/5 transition-colors cursor-pointer">
                  <div
                    className="w-12 h-16 rounded-lg bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url('${activity.image}')` }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      <span className="text-primary font-bold">{activity.type}</span> {activity.title}
                    </p>
                    <p className="text-xs text-text-muted">{activity.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted/60 mb-1">{activity.time}</p>
                    {activity.score ? (
                      <div className="flex items-center justify-end text-accent-gold">
                        <span className="material-symbols-outlined text-sm">star</span>
                        <span className="text-xs font-bold ml-1">{activity.score}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end text-text-muted">
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        <span className="text-xs font-bold ml-1">{activity.increment}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Currently Watching */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">play_circle</span>
                Currently Watching
              </h3>
              <Link href="/lists" className="text-primary text-sm font-semibold hover:underline">
                View Lists
              </Link>
            </div>

            {watching.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 block">tv_off</span>
                <p className="text-sm text-text-muted">No anime in your watching list yet.</p>
                <Link href="/anime" className="inline-block mt-4 text-primary text-sm font-semibold hover:underline">
                  Browse Anime
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {watching.map((item) => {
                  if (!item.media) return null;
                  const slug = `${item.media.mal_id}-${slugify(item.media.title)}`;
                  return (
                    <Link key={item.id} href={`/anime/${slug}`}>
                      <div className="glass-card rounded-2xl overflow-hidden group cursor-pointer">
                        <div className="relative h-48 overflow-hidden">
                          <div
                            className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                            style={{ backgroundImage: `url('${item.media.image}')` }}
                          />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase">
                            EP {item.current_episode}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-sm truncate text-text-primary">{item.media.title}</h4>
                          <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wide">Watching</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Favorites Grid */}
        <div className="col-span-12 xl:col-span-4">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">grade</span>
                Favorites
              </h3>
            </div>

            {favorites.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-3 block">favorite_border</span>
                <p className="text-sm text-text-muted">No favorites added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-4">
                {favorites.map((fav) => {
                  const slug = `${fav.mal_id}-${slugify(fav.title)}`;
                  return (
                    <Link key={fav.id} href={`/anime/${slug}`}>
                      <div className="relative group rounded-xl overflow-hidden aspect-[2/3] cursor-pointer">
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('${fav.image}')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <h5 className="text-xs font-bold text-white truncate">{fav.title}</h5>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <Link href="/favorites">
              <button className="w-full mt-6 py-4 glass-card rounded-2xl text-sm font-bold text-text-muted hover:text-primary transition-colors border-dashed hover:border-primary/50 cursor-pointer">
                View All Favorites
              </button>
            </Link>
          </section>
        </div>
      </div>

      {/* Settings */}
      {user && (
        <section>
          <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary mb-6">
            <span className="material-symbols-outlined text-primary">tune</span>
            Preferences
          </h3>
          <div className="max-w-lg">
            <HContentToggle enabled={profile.show_h_content} />
          </div>
        </section>
      )}
    </div>
  );
}
