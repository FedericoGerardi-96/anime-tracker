'use client';

import { ChangeEvent } from 'react';

interface LibrarySearchProps {
  value: string;
  onChange: (v: string) => void;
}

export default function LibrarySearch({ value, onChange }: LibrarySearchProps) {
  return (
    <div className='relative group w-full max-w-md'>
      <span className='material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors text-[20px]'>
        search
      </span>
      <input
        type='text'
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder='Search by title or description…'
        className='w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all'
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors'
        >
          <span className='material-symbols-outlined text-[18px]'>close</span>
        </button>
      )}
    </div>
  );
}
