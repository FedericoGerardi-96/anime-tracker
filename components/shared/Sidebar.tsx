"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/anime", label: "Anime Library", icon: "auto_stories" },
  { href: "/manga", label: "Manga Library", icon: "menu_book" },
  { href: "/lists", label: "My Lists", icon: "format_list_bulleted" },
  { href: "/favorites", label: "Favorites", icon: "favorite" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col glass h-full shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary p-1.5 rounded-lg">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>movie_filter</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">AniTrack</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Track your journey</p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href}
              className={`flex items-center gap-3 px-4 py-3 transition-all ${
                isActive 
                  ? "sidebar-item-active text-primary rounded-r-lg" 
                  : "rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
              }`} 
              href={item.href}
            >
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
          <Link 
            className={`flex items-center gap-3 px-4 py-3 transition-all ${
              pathname === "/private" 
                ? "sidebar-item-active text-primary rounded-r-lg" 
                : "rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
            }`} 
            href="/private"
          >
            <span className="material-symbols-outlined" style={pathname === "/private" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              lock
            </span>
            <span className="font-medium">Private Manual Entry</span>
          </Link>
        </div>
      </nav>
      <div className="p-4 m-4 rounded-xl bg-primary/10 border border-primary/20">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">My Lists</p>
        <p className="text-sm font-semibold mb-3">Sync your data across all devices</p>
        <button className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg text-sm font-bold transition-colors">Login to sync</button>
      </div>
    </aside>
  );
}
