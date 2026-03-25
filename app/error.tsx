'use client';
import { useEffect } from 'react';

import './not-found.css';

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className='mt-20'>
      <div className='row'>
        <div>
          <div className='text-404'>
            <b>500</b>
          </div>
          <div className='text'>
            <b> INTERNAL SERVER ERROR </b>
          </div>
          <div className='flex justify-center items-center mt-10'>
            <button
              onClick={() => unstable_retry()}
              className='flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer'>
              <span className='material-symbols-outlined' style={{ fontVariationSettings: "'FILL' 1" }}>
                refresh
              </span>
              <span className='uppercase text-xs tracking-widest'>TRY AGAIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
