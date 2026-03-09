

const HERO_DATA = {
  title: "Chainsaw Man: International Assassins Arc",
  description: "Denji's life as a public safety devil hunter takes a dark turn as international assassins converge on Tokyo to claim his heart.",
  image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCv2vtPuVZY2iNs5QfD_HAjjjXcwPK4U-6X--76OA0_K02OYmAneUrDY7S9F0HHV6jtjBPCweaOokjgTsDOnGkcLuuI8U0zTRGm2xx_fH5OwcGaDyRXdCmfGR8IEp4n9mi_tzSTyRrpelBHcny2utOr-O-q6uneJjYY3NL3dcek6rIJkxFmsu-ukKSVvu4mU9BpryqrfyS3LlZhZNrL_Z4R0Xz8puZyhmbWeZ4WU0t8kxswrBm8nOEJ7hlBhx7Oq2oEflI5Ihaj3v4"
};

const AIRING_TODAY = [
  {
    id: 1,
    title: "Solo Leveling",
    episode: "Episode 12",
    time: "11:30 AM",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDedyhUSWGtMHHk2HIyP7v7KvnjyWoEkJU_dCFgx4Md90v7CFCYFk0dcqSzpWjBShiQ6_NxQSgPAQanGczSDkf7WUSVzKnO1kZ90Z5uNoK-2RrHT4p737bofg7c4oCTztA9E8YUajN9Up4QhsNUMgSayHb_3hieJM_1zyPrvMI8V7CveO-Y_v7EC8c4QVXyYFCSEXjSbQrJZvVqG9z3JwTpNnGkHXOHA0vApHz8SfZp8xu1L2AjaZ2mtBlnI-uW_B0OfzTs9D21V3A"
  },
  {
    id: 2,
    title: "One Piece",
    episode: "Episode 1095",
    time: "10:00 AM",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCyi3vx3AKxCf1UleWac8F0K2To5w-R4UmrivtF-mINF2CkcKUzUeC8zEmSJeq8MPRQ0YCr-2b0At_KMH6zyUdlXEHUvkzxTRcRblzLtSdRT_Pkg7hCMdmZHBeYDLUX7x2T9hUhQZl8bM5YpMSxakZj-HYRJOPLFPf4paSlWOetCrPU5on5tUJXOf8bK72Ai9fZ5h75qep_xn2ByCbNp-UCuv5pFMr9ftKi7DW0Q9SGP0p22nkwnLI9Mdu0VheNYvodgWndQQM7Qkc"
  },
  {
    id: 3,
    title: "Jujutsu Kaisen",
    episode: "Episode 24",
    time: "01:00 PM",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDCkVRjq_7gWidqrQ9cfneuPQ3pNeOI4HsrxFI7zu2ax4DnZG-b33JietmelMkAjveZexrITnU4Ry9ug3iEcSXSAk3UBBX5t-MzijcPrl1neNuGu9iy1qKxdujCSru2cWy6aL6Vzyyj1lyA54xoKJiAyDUE1NdKKUgVHiYMbZrsfMJMafXFDa4TqPTkn-4TbFUdaMj2kqDpzmnKrEYBCYJYn--IGLQHpsJcwb-lSP2waYxFFcc3o_mhihFvv0-geaACjfpE7yo7wY"
  },
  {
    id: 4,
    title: "Spy x Family",
    episode: "Episode 25",
    time: "03:00 PM",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCizoFVsY22JDX4sAxtpA-5S5c59lEDEiLaBiaW0Lu_TPq8Vesf6OAw1TzLHuMv5qQ_lXzE65ae1giPkXFdIaCgyDdw4KV9wnkS2LBBWERe25GUKI13u6b6ItJErumiDE0HcEchlUbG2xtw3__P_DbjEf0pyhDksANJFgF8wy1oX5iq3qZr0Puu1Om97mNSGWKN10JFYNJWI5-U9F6cgprBff5Ai4T-btEu1JHb6RcmkSo-5CH8riQaJ-bigPCtu_O0y5VN8c8V2VE"
  }
];

const RECOMMENDED = [
  {
    id: 1,
    title: "Blue Lock",
    match: "98% Match",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwR-pQ_L0BzKFAfxxwsiB7_FOqXRavcj7InGcTdd8r89-bWdAWtAl3boyIVwegtr1jZfupvpOeLQPe4BPuIEgVE13V_McnSUD2iZwzAQji-WoO7eJCn8VHrlaeDxoodCB-gMXnEjJRVx1DnG8Z6Ag5MBfF9eZ6q8p8RvYaHT88_kDKdjdEGpydJ3rZDSvqj0TG2K-uDM1U6FGV8gwXiAbwzEiX_o3b6jD_nA5dA7q2e8TAYvI_hBTnXKbM8atAW3MfBT8LE9OTioc"
  },
  {
    id: 2,
    title: "Cyberpunk Edgerunners",
    match: "95% Match",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDV3JVRQ95rb7dkRJ3xrLv7luqJoGlzjZj3DgKVkxk_dDqzBYHVHPLkxQ4R4U1zQFBvCJejDjYODlDR35pjj5hqboEHC9lrL1HUmH1IORiJRLmRuhX2Wk8vKQQWoBYPKcfDAz6pEWL3EFNpOGMRFSYhBlVRZ5EeZQ6wSNLngEwrDl1XdDALi3VixzNp3M8EAczyG65x6DIDeQMYDHApo_Yfb6CmGRkuiv9p0cou7S0UMRNIGFVrORqvjDuuPOXXTxh8-VMH7zNEnhU"
  },
  {
    id: 3,
    title: "Demon Slayer",
    match: "92% Match",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCGEHGOScsgqUV9DX82NqjJ77zFShNpDoD8FJQN_dqbhnLFco0Jnj1p6TuJM7vntzIrtTSRTCpyPyKSbS0GDXTRk5e7TBXxOaDN83tKS1PbZ_AgVVXa5eDMlyMhxKYuGO1goaeJr8bAh91KAQkqqA0catt9M0XtHVdG27iE8TOTblPU1D2mDI3kHuwWP_tEOQXztqkAw7Lpyamt_4cH72KkPniB4hiSYW5DaC_rGbIw9VOsDpp4n2F_Qi4BZ6wspaiXmZAUSeSq5Ho"
  },
  {
    id: 4,
    title: "Attack on Titan",
    match: "89% Match",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4pgO4L9UwX-wI8UoLNWs10yTaee-iXVe5P4S_puEIhHYQ9Zhx5rU2985R3-3pBTIVF1oSM39Z1YREl4-LbUTqVARjosOQKCC9rhxuWKGFlbEnlDdcWX6e_yLEshQf-YkiK5aeeuePtVi2-Vd7uiQnzmKY5k1xqCwG-8wTIlU2uk2VOj3rpfOm0Nj3b7gxjygmFQFB88GlS0vtIji3yJKTSv-2awYAzsaoGRCzOEYnhxtwFoAlBXy4L_OfDbDMurcBu0U69BCerG4"
  }
];

const FRIENDS_ACTIVITY = [
  {
    id: 1,
    user: "Alex",
    action: "finished",
    anime: "Mushoku Tensei",
    time: "2 hours ago"
  },
  {
    id: 2,
    user: "Sarah",
    action: "added",
    anime: "Oshi no Ko",
    suffix: "to list",
    time: "5 hours ago"
  }
];

export default function Home() {
  return (
    <div className="p-12 space-y-12 pt-28">
      {/* Hero Carousel */}
      <section className="relative w-full h-[400px] rounded-2xl overflow-hidden group">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
          style={{ backgroundImage: `url('${HERO_DATA.image}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-10 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider">Trending Now</span>
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white uppercase">Series • TV</span>
          </div>
          <h2 className="text-5xl font-black text-white leading-tight">{HERO_DATA.title}</h2>
          <p className="text-slate-300 text-lg line-clamp-2">{HERO_DATA.description}</p>
          <div className="flex items-center gap-4 pt-2">
            <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:translate-y-[-2px]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Watch Now
            </button>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined">add</span>
              Add to List
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Grid Area */}
        <div className="lg:col-span-3 space-y-8">
          {/* Airing Today */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Airing Today</h3>
              <a className="text-primary text-sm font-semibold hover:underline" href="#">View Schedule</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {AIRING_TODAY.map((anime) => (
                <div key={anime.id} className="group cursor-pointer">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                      style={{ backgroundImage: `url('${anime.image}')` }}
                    ></div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded font-bold uppercase">
                      {anime.time}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-4xl">play_circle</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{anime.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{anime.episode}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended */}
          <section>
            <h3 className="text-2xl font-bold mb-6">Recommended for You</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {RECOMMENDED.map((anime) => (
                <div key={anime.id} className="bg-slate-100 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-200 dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <div className="aspect-video rounded-lg overflow-hidden mb-3">
                    <div 
                      className="w-full h-full bg-cover bg-center" 
                      style={{ backgroundImage: `url('${anime.image}')` }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold text-primary mb-1">{anime.match}</p>
                  <h4 className="font-bold text-sm truncate">{anime.title}</h4>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Widgets / Sidebar Right */}
        <div className="space-y-8">
          {/* Personal Stats */}
          <section className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800/50">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Personal Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/30">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Watch Time</p>
                  <p className="text-2xl font-black text-primary leading-tight">124<span className="text-sm font-normal text-slate-500 ml-1">h</span></p>
                </div>
                <span className="material-symbols-outlined text-slate-400">schedule</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/30">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Chapters Read</p>
                  <p className="text-2xl font-black text-primary leading-tight">450</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">auto_stories</span>
              </div>
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500">Weekly Goal</p>
                  <p className="text-xs font-bold">12/20 Eps</p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-[60%]"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick List Sync Banner */}
          <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <span className="material-symbols-outlined text-9xl">cloud_sync</span>
            </div>
            <h4 className="text-lg font-bold mb-2">My Lists</h4>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">Login now to sync your progress, get tailored recommendations, and access your private entries.</p>
            <button className="w-full bg-white text-primary py-2.5 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors shadow-lg">
              Login to Sync
            </button>
          </div>

          {/* Mini Community Feed */}
          <section className="glass rounded-2xl p-6 border border-slate-200 dark:border-slate-800/50">
            <h3 className="text-lg font-bold mb-4">Friends Activity</h3>
            <div className="space-y-4">
              {FRIENDS_ACTIVITY.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-bold">{activity.user}</span> {activity.action} <span className="text-primary font-medium">{activity.anime}</span> {activity.suffix && `${activity.suffix}`}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
