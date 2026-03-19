'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/lib/actions/auth';
import type { User } from '@supabase/supabase-js';

export default function Topbar({ user, profile }: { user?: User | null, profile?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search')?.toString() || '';
    
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    router.push(`/anime?${params.toString()}`);
  };

  return (
    <header className="flex items-center justify-between px-8 absolute top-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 h-20">
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          <input 
            name="search"
            key={initialQuery}
            defaultValue={initialQuery}
            className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none text-slate-900 dark:text-white" 
            placeholder="Search anime, manga, characters..." 
            type="text"
          />
        </form>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <button className="text-slate-500 hover:text-primary transition-colors cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="relative group shrink-0">
              <Link href="/profile" className="block w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/10 hover:ring-primary/30 transition-all shadow-sm cursor-pointer">
                <div 
                  className="w-full h-full bg-cover bg-center" 
                  style={{ backgroundImage: `url('${profile?.avatar || 'https://res.cloudinary.com/do3n04ysn/image/upload/v1692600735/anime-app/gw87wdnbncrslkemdxe4.png'}')` }}
                />
              </Link>
              
              {/* Dropdown menu */}
              <div className="absolute top-12 right-0 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                <form action={logout}>
                  <button type="submit" className="text-sm font-bold text-red-400 hover:text-red-300 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700 w-full transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <Link href="/login" className="bg-primary hover:bg-primary/90 text-white font-bold text-sm px-5 py-2 rounded-xl transition-all shadow-lg hover:shadow-primary/30 cursor-pointer">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
