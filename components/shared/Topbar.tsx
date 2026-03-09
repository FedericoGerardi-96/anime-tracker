export default function Topbar() {
  return (
    <header className="flex items-center justify-between px-8 absolute top-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 h-20">
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none" placeholder="Search anime, manga, characters..." type="text"/>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="bg-primary text-white px-6 py-2 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all">
          Login
        </button>
      </div>
    </header>
  );
}
