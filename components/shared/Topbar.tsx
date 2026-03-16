
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Topbar() {
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
        <button className="text-slate-500 hover:text-primary transition-colors cursor-pointer">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div 
          className="w-9 h-9 rounded-full bg-cover bg-center ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer shadow-sm" 
          style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBquqpt9P2MbGMN84OSVAurzumh0JjuorGe6g0PJtr7iElz98hAzeGcd_QBhcHK_YI4zf3FLyAB7RhTbCRSi0ch2PACysSdB0JomcZRjZBr-uQbk7T1AMof_-Dqud79X-LF5wCpnC0zGvkFGLXUFyimm3WRAsJSDUiLGPltEg13n0-ymZzrzVb0zI6sflAKPMKuFR6bPDGQapNtOCENk4Xb3ooovIdrl7wW-pvUEwA0epzUgEgnVo3ncMssup558HwZikl6p2OdGmE')` }}
        />
      </div>
    </header>
  );
}
