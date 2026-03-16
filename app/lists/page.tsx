
const COLLECTIONS = [
  {
    id: 1,
    title: "Watching",
    count: 12,
    isPublic: true,
    updatedAt: "10m ago",
    status: "Updated",
    icon: "schedule",
    covers: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCYXoDrY_hV-8Xs2PkUfunGSfTkxOYaIflkNVRmWATHCmfoFGe8ko7_IkrKFRNGgUEZaTL3-Z9zte-ZeYXfrdgGelnfwZxDNHv569bk44cuI4GesgqPCWKZagNUvmLA7gjZ3mFGuhDh_8vzz3JnonI_90SmPzvpMU5399mNgjkYwg9tA7bzwESWHGKrhwmuK8L4-hOeUiHm9R_YLgcKuqSXnYgGbUzFFTCacf8G-TSLkZcWXblJ-Muke_3wxQE-qnajog2ei871xIU",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDoHsTekrARyOwhOJbqiqQy3PICAqvPDIZpxalmEyTFZrXLq66cVDRDag6WrAxGVCo0G1aNX9oM6SE_SHSUVtkL4SJ_PhKqEdSoi0i8t0-cXzVnZLTy9QahdqRo2rSMGyq-bk2uorCAvNXgQYwZZcCUuv_eblm2abZV8KnaSgd_Ru0sNIXn9YgeLeOotR7SMiKwPVh9gEoEwpT7yLsAk1y_kb7gub-fBVIwWNxdJ3XBrzYiOnawCcEASNl-RQOK54oXFVJhZjgHj2c",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBKGeLGYsMBUhRgApllHEugwWzzsmKfexGQpuxWVj4qiaD2xXjOnK7SldLjWEQh2VysspzpIu9JA8ZTq95RIP_ZvXRMGQJcfDZ1CKkhy7hs4rLjG75wrv-49kgBEYc_XzFpcQWaHhgGfSwzNjA9o7wmwfB9_Uh3UrMTGSTosF4XWnrKRWRrzc36BRIep-SHQ7tdYvm_bwPA4fo100yw9Knrmi2GN5BNmyvBOphwZomcx7FfttYC2l0kNxPm0Wzc0rWpUKzPyxslZiQ"
    ]
  },
  {
    id: 2,
    title: "Completed",
    count: 248,
    isPublic: true,
    status: "Completed",
    icon: "done_all",
    covers: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD6WMehCzScxfZ7AoU6JadYlKuvZnd1yT_5ZIUo5VdckndacFFjmx289ir6H3ihl-9Auzqyh-nOVf8ANXzfuo-Uo3VCkSiS4Qa57EyQK__-dtNDFGXCUEBMkmkF3UFyDVyKR8RNbwBj8Wc4vIVCw1Ir5S5s2-gfYC_8OubEAceH5nz7N_KOTeGRVhXoQvG_UB4elQo-Za1EljFJKVhZotzgwU6CRJI-fe1rkruWXmBEwnLEg--7Wavcpy9zIAWUZKqJjeACfCXCvNo",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCkNtUzdjvd8Jgq2ZLOcdr7dDIvl-a5Q2nNt_JiZzq5UKeHSHxQDMG7vnD74sDWtrTs9o6SZf3XyBIvCINwyQpX3Rc5YRAVuCngnl8H-jbhJtNKEhw7TvGzvFHLZ9JZ1bLJBE4ccFg2pndvgoSFR1qPm4-hEDzhv5EnKO7_6eEcEmNHQU_xRDdp5hQmxDjWZt5L4lkoktnB4KnN0L9zEgKrgqXihGxcmE6D78CPtID6UPV7vilw0DlzyYAMVYU_miC_37uy36N6dI4",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDMVp8G0E7bSN-QSh1VZS_zzCUFY_iRkNF6NMZwB6giFT-mGB3YgK3OAkFU9NzjgRFXZOW8sqyV7i8lJ9TjwP59B-yUZrdU3iHgGANv2jGmyuNb_RctEaPfV1QtSX20EfgZtZIrPW_rMpivBs-a3wOhLEOaWKEaa6n4DhAk5_ZylTzoGOvywbpUJIAZRhGtskNdNnyG8IzP8GCjzVnSQ4ImqdGGQhpt9yTGLVOyOZCCvlq5DedPYFFpIaWy3TCSM8wz7FLxh2q9x_o"
    ]
  },
  {
    id: 3,
    title: "Plan to Watch",
    count: 84,
    isPublic: false,
    status: "84 Remaining",
    icon: "bookmarks",
    isPrivate: true,
    covers: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAY-plqJdMExvAmWftbJHo-3K8nO7yHjPi908OtWMl-lGTxkoud85VsxFomBVRAXTQEQlw_gyJw13kzxU3M_y26CyUXxvN7-KItKuUBBdhTLknJegopTKrpBQbk9ZWNSgBHeQYEqwLuLf1m1dwS8lITgw9x-IeXYqe3eL6YJoWyUKc_xEVkSXRuKxTV505YAEsIhjpnMLhh791VcMfpfn8nbK0dp86UU90e-7Gwf_7SSvXvl_NsKg-kEXfS_ywfSZFidp5yxfF-4BI",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCrug8Urtv9WiT6SL0ZyyNcDocG98V6aBXMPr9fzpGDS1_lGKreny21r1pxefloBuWX5Uk47Sx3Htxu0Z3cpH2DaIRmz-b-itE_x9NNDNShcMfX8KR0VNPhI8A1duQp2BXmuNwQl2HNp4Tq4oMSGr1ukP58KwwdpbolJBAwm-PIhYyH0C2uV0oeC20PxICCzVQg4AkAfhb7_NgIqQPLTh8RNHD1SH1cvjHhWIfuPAofYAeC2KBLAM8jMBuZrdc_2sUaWgAqq_Kj1Y8",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC4InqWs0e9gCREj_ZKs4LqwVZc9rswEsVX65E6ym928WgzsztJ2xdvqCbgE9Un4OTn3al8oq3Ik7JNlKdlcmykEH7rJoFjPpiI9Qt2aStyUAGFSP_WUWJVfErJmM8AqEdXLT4pcp37rRSN07SxDUfmOnsi3xzUbS8FvfLW4QQT5mRIrYZre6ZonqoX1gC1rWkq5tU949JjdfFye94uzE78MZlVlmkf_sPSSeLxzZaPvENwEk7UAjzcrWjb22YhwhdWiG33UUZph0g"
    ]
  },
  {
    id: 4,
    title: "Dropped",
    count: 16,
    isPublic: true,
    status: "Stopped",
    icon: "cancel",
    grayscale: true,
    covers: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDH5UGiS15t_-N7FbAFf-PkPdY2qXiv5qJ3QrsWyG6xCZ-XvV28nyU2UvcmmA3SbXWk7jWAi77jfP-bUleDVkI35OOcyYL-KYf-NOiNaYEM6WEz3WjJ2M7eVqiiYwvoECbJKVX0CIj_5xxc0DkCxXoe5Q909LOtomJDRHP2X0-jMr9_8DI_rE93baYNpllPFCHdKS5JwvUdF--qMyEbLCN9cqwQjEOB8e2VqlEzr5iilvhD81TbQCnlrwV60AC3qiN-_CH6_I9Ic6M",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDF6-6auU7-y6032BadQLOd8MxWKHnr9rEVNVaM--1fWICWtTK-btTETzOAauHrVHRQtEtlIXL0_V5n7iO28xRTyCLoosJE1tbC2qXXYppZd8XGeKF1B1YLnQ1D0fishEV79ogQigV8DmPQPIyhLF7broedyoB2ZqyFP-9x9moe08l9aSsEz5n0nu8nIqEvS8lgQjQUROKmqt2ViJuKUCS9-rwA0ROpMtkt-ReoN7S3yfGGw1ca0UAjqSUFJQLC2kn7iMk2i5kcJvQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBQTFzfZZ1fihQf_H08LOiltyOtwI1G3fNbSM1cnDzWg8Gqv20PSqwvpBmp14PfRf0pdJhTAiO3AqIgBDhreA0ur6mmMH1t0yPXHF9mG2ZkwpyXors5tNcxezOTMPYkAtQxAEk35Af2_Y7dixUObC92hWAy3uQab_FamdYNKYjRcyjhW0f01Yo9wQZ-ZU1Iy1qGzEa3EK5g4zLMIjFxLzPzW-mdNB8Oc5x_NpOYKeZy91559S-FaKyjnqdw6wbbeK097719vUuvWyQ"
    ]
  }
];

const TABS = ["All Collections", "Watching", "Completed", "Favorites", "Custom Lists"];

const PRIVATE_COLLECTIONS = [
  {
    id: 1,
    title: "Summer 2024 Seasonal",
    items: 24,
    hidden: true
  }
];

export default function MyListsPage() {
  return (
    <div className="flex-1 p-6 md:p-12 space-y-8 pt-24 lg:pt-28">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">My Lists</h1>
          <p className="text-text-muted text-sm mt-1">Organize and track your favorite anime series</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20 cursor-pointer">
          <span className="material-symbols-outlined text-xl">add_circle</span>
          Create New List
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
        {TABS.map((tab, idx) => (
          <button 
            key={tab} 
            className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              idx === 0 
                ? "border-b-2 border-primary text-primary font-bold" 
                : "border-b-2 border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {COLLECTIONS.map((list) => (
          <div key={list.id} className="group relative glass-card p-5 rounded-2xl hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-text-primary">{list.title}</h3>
                <p className="text-text-muted text-xs font-medium">{list.count} Series • {list.isPublic ? 'Public' : 'Private'}</p>
              </div>
              <span className="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">more_vert</span>
            </div>

            <div className="flex -space-x-4 mb-6 relative h-32">
              {list.covers.map((cover, idx) => (
                <div 
                  key={idx}
                  className={`w-1/3 h-full rounded-lg bg-center bg-cover border-2 border-background-dark shadow-xl transition-transform ${
                    idx === 1 ? 'z-10 translate-y-2' : idx === 2 ? 'z-20 translate-y-4' : ''
                  } ${list.grayscale ? 'grayscale' : ''} ${list.isPrivate ? 'opacity-60' : ''}`}
                  style={{ backgroundImage: `url('${cover}')` }}
                />
              ))}
              {list.isPrivate && (
                <div className="absolute top-0 right-0 z-30">
                  <div className="flex items-center gap-1 bg-slate-950/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-[14px] text-amber-500">lock</span>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Private</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className={`flex items-center gap-1 ${list.title === 'Dropped' ? 'text-red-400' : list.title === 'Watching' ? 'text-primary' : 'text-text-muted'}`}>
                <span className="material-symbols-outlined text-sm">{list.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{list.updatedAt ? `Updated ${list.updatedAt}` : list.status}</span>
              </div>
              <button className="px-4 py-1.5 bg-white/5 hover:bg-primary/20 hover:text-primary text-text-muted rounded-lg text-xs font-bold transition-all">Manage</button>
            </div>
          </div>
        ))}
      </div>

      {/* Private Lists Divider Section */}
      <div className="mt-12 mb-6 flex items-center gap-4">
        <h4 className="font-bold text-text-muted uppercase tracking-widest text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">lock</span>
          Private Collections
        </h4>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
        {PRIVATE_COLLECTIONS.map((list) => (
          <div key={list.id} className="group relative glass-card p-5 rounded-2xl hover:border-primary/50 transition-all cursor-pointer bg-white/5 border-dashed border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-text-muted">visibility_off</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">{list.title}</h3>
                <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">{list.items} Hidden Items</p>
              </div>
            </div>
          </div>
        ))}

        {/* New List Placeholder */}
        <div className="group relative border-2 border-dashed border-white/10 rounded-2xl p-5 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center py-10">
          <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-primary/20 transition-colors flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-text-muted group-hover:text-primary">add</span>
          </div>
          <p className="text-text-muted group-hover:text-primary font-bold text-sm">New Custom List</p>
        </div>
      </div>
    </div>
  );
}
