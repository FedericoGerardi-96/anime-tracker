import { createClient } from "@/lib/supabase/server";

const PROFILE_DATA = {
  stats: [
    { label: "Watch Time", value: "124h", color: "text-primary" },
    { label: "Chapters", value: "450", color: "text-primary" },
  ],
  recentActivity: [
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
  ],
  winterList: [
    {
      id: 1,
      title: "Frieren: Beyond Journey's End",
      progress: "EP 24/28",
      percent: 85,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBpKNXbc0mY1wUVUSjUTrNnLroWYy_FsTDKYhJeZIbP-OMJrVh1OurTvgV54mK-a0XMYPYfUCuG-ttGxekuMngvGhOe9KPIhXo6-ur25bjCdaZEBDfWRrzrMmDo_R4TTl-hogVTkWcoMY0DXsp8yuzPtBdtMpXS3nhcVb_mY8TTZhT8vvqSOdgl4IWPlYVpFQqnkdOKW45JV3Ax-b97Vrkz_KpPLAfocBYmigdKw7kZhZjyt4thX2vHa47PbRB2pnX-bVQYlnaiwRo"
    },
    {
      id: 2,
      title: "Dungeon Meshi",
      progress: "EP 10/24",
      percent: 42,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBylBMlf4wxSwo-MzluIQVFgqy-KRns1ttUSmPkFIApDxlRxKlwOPudRovDs3jj4LUzjrfm42MnzAw-k0kxkVSR8Uuge2GNIblcd76TxT-7MMGoj_9-H4eIdNUKNw5qA9UXB_gMiWZEWZaTgWe6u_UyW7UWdI8Xm1Uvl_HerswujvUWJ-tJPDLPdXKRG14TjS_1ozcQ-Yziq59fSC4ZZhyR8SYlY9djvk3utaVpIFVIGO5sNOwfPpX5TBadB46fPNuZbvZrVQep-N0"
    },
    {
      id: 3,
      title: "The Apothecary Diaries",
      progress: "EP 20/24",
      percent: 83,
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlGwGf06KNtHiQ98mHJsbZlj2m5aq7HfIHKOJdditZOZfiWtVfTw-L5WgET97QpO2ISI_BTuJ0MSWACh1tL21YLnxHlBzq8gZUGyTLK7dMDF4I7EB0gxb93Vv2qUzeKDycYZkkgKONkKVPFfX2DqT-kuzFHovDixRIsz2Ug-FWO-XNYL1ubBtARc2-cY6P28oBEn4CIxXvm5ItBycSXf-5rlO8AOrW0VzOG7vT4ye_J3OkpBOcZsS0DKTLPBnUFmxj8LLk4D8yvgY"
    }
  ],
  favorites: [
    {
      id: 1,
      title: "Steins;Gate",
      score: "9.07",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9hYbrjhHjU-OkFwZ0xDYt1oY4rfhDCxj-5fpw1dWhC9goWPA8-nWbuUz-fLmzDb6cfc_YNFHJaN3DBBoGKv5UILjkqLCHAdH3ZsklZPNt_LIBc93IbIfECcGSeoBzT19ShWxjHRb45x3qc5BdVpPu52eMcQ-9LRTutbDXAZpQG9sZbhwjoQUucdWor4rmAtxjuHChsS0znoLvtVowI85vFU7P3n2azRSEu9J-tHcsK1864adbgNVnc63KT6nMS-d_pbZrEV9Gjqw"
    },
    {
      id: 2,
      title: "Berserk",
      score: "9.47",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1Y3EOGzEZJGGjBmpDrlZP2Z6TJ1Gw0YL1CdQhjL9FfC5lf4l8gOHdNUICm0wNtPuTgMexMk8rKO4-wI8S2TiHGgYP9RIy2PTbPD-LrPrHP8Hc9HJ-dyYJzUitAklnHacleCAt21WgnNZcey14btobuiEovfMBAIxGDP-yMjIDSdA9VtueRKfhhtJ8IKdPKwuLlBIjcwaFZCuBLykQV87PpFHTGjkbYNTtd7k5cwbQXPpEyQZkVNHQrWBOIFawLB1zYSSWC8ieAcs"
    },
    {
      id: 3,
      title: "Monster",
      score: "8.87",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAoUYxw9lCcWBPFow4S5UpCdfkvUz4KLq7rzIjbP636q4lktr6FAw-4n98Z6x9l1nzyj38nYrttli8DyHSYBy-LQBurYcWRop8iFX492k7ro8csgVfztJu_BmfIojP5QjOamnsnFjo9KXtXD20i-dopt65BPkJOlUPWzu2AdBhu59J40cn40M6IbjcqvTkP-IrZy4ULlUpVFjJ5egpDBRbgT38JdxT-bs5x_9X7FbCOzl8ZQHQeQAphCxsbr39_Zbbv4ET5o-MA9Qw"
    },
    {
      id: 4,
      title: "Vagabond",
      score: "9.24",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1uZC22s3ktt_Bo9ELQvvyzARt5KHKOq9nUxJcs4UK7KCaZ_cct2NptZF0EJGrSNI7Ht-HOPr2YilHOCQAqBl_-KakklAZNU3FoT8WbJeHdJHJmdTLO918JKpe1J5EIj_14c3twOIoJE2NwH3NePW6uPdODTYZElsorYFPe6hctea0Oz07fZOfhHTTtQpV6NAHgft25rItjrJiefsdMmxtv14-U09G7IoCjDQ6ofVKhBiEWUOlZYqamLqmbRjVq23Skn2daYHGlnI"
    }
  ]
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = {
    name: "Unknown User",
    avatar: "https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png",
    tier: "MEMBER",
    bio: "I'm new here! Exploring the world of anime.",
    verified: false,
  };

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) {
      profile.name = data.full_name;
      profile.avatar = data.avatar;
      profile.tier = data.roles?.includes('admin') ? 'ADMIN' : 'SUPPORTER';
      profile.verified = true;
    }
  }

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
            {PROFILE_DATA.stats.map((stat, index) => (
              <div key={index} className="glass-card px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-center min-w-[100px] lg:min-w-[120px]">
                <p className={`text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[9px] lg:text-[10px] uppercase text-text-muted font-semibold tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Activity & Lists */}
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
              {PROFILE_DATA.recentActivity.map((activity) => (
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

          {/* Winter 2024 List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
                <span className="material-symbols-outlined text-primary">folder_open</span>
                Winter 2024 List
              </h3>
              <button className="text-primary text-sm font-semibold hover:underline cursor-pointer">Manage List</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {PROFILE_DATA.winterList.map((item) => (
                <div key={item.id} className="glass-card rounded-2xl overflow-hidden group cursor-pointer">
                  <div className="relative h-48 overflow-hidden">
                    <div 
                      className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" 
                      style={{ backgroundImage: `url('${item.image}')` }}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase">
                      {item.progress}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-sm truncate text-text-primary">{item.title}</h4>
                    <div className="w-full bg-slate-200 dark:bg-slate-800/50 h-1 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-4">
              {PROFILE_DATA.favorites.map((fav) => (
                <div key={fav.id} className="relative group rounded-xl overflow-hidden aspect-[2/3] cursor-pointer">
                  <div 
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                    style={{ backgroundImage: `url('${fav.image}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <h5 className="text-xs font-bold text-white truncate">{fav.title}</h5>
                    <div className="flex items-center gap-1 text-accent-gold text-[10px] font-bold">
                      <span className="material-symbols-outlined text-[12px]">star</span> {fav.score}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-primary/90 text-white text-[10px] px-2 py-1 rounded font-bold uppercase backdrop-blur-sm">
                    MAL {fav.score}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-6 py-4 glass-card rounded-2xl text-sm font-bold text-text-muted hover:text-primary transition-colors border-dashed hover:border-primary/50 cursor-pointer">
              + Add to Favorites
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
