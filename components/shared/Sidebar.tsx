"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/anime", label: "Anime Library", icon: "auto_stories" },
  { href: "/manga", label: "Manga Library", icon: "menu_book" },
  { href: "/lists", label: "My Lists", icon: "format_list_bulleted" },
  { href: "/favorites", label: "Favorites", icon: "favorite" },
];

export default function Sidebar({ user, profile }: { user?: User | null, profile?: any }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        className="md:hidden fixed z-50 bottom-6 right-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-primary p-4 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          {isOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:relative z-40 md:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-dark h-full shrink-0
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>movie_filter</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">AniTrack</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track your journey</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
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
                onClick={() => setIsOpen(false)}
              >
                <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
          {user && (
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <Link 
                className={`flex items-center gap-3 px-4 py-3 transition-all ${
                  pathname === "/private" 
                    ? "sidebar-item-active text-primary rounded-r-lg" 
                    : "rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                }`} 
                href="/private"
                onClick={() => setIsOpen(false)}
              >
                <span className="material-symbols-outlined" style={pathname === "/private" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  lock
                </span>
                <span className="font-medium text-sm">Private Manual Entry</span>
              </Link>
            </div>
          )}
        </nav>

        {user && (
          <div className="p-4 mt-auto">
            <Link 
              href="/profile"
              className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-primary/5 transition-all cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <div 
                className="w-10 h-10 rounded-full bg-cover bg-center shrink-0 shadow-lg" 
                style={{ backgroundImage: `url('${profile?.avatar || 'https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png'}')` }}
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate text-text-primary">{profile?.full_name || user?.user_metadata?.username || user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-primary font-bold uppercase">SUPPORTER</p>
              </div>
              <span className="material-symbols-outlined text-slate-500 text-sm">settings</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
