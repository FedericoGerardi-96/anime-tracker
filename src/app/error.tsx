'use client';
import { useEffect } from 'react';
import './not-found.css';

export default function ErrorPage({ error, unstable_retry }: Readonly<{ error: Error & { digest?: string }; unstable_retry: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isMalDown = error.name === 'MyAnimeListApiError' || error.message.includes('MyAnimeList');

  return (
    <main className='mx-auto flex min-h-[70vh] max-w-2xl items-center px-6 py-16'>
      <section className='w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-12'>
        <span className='material-symbols-outlined mb-5 text-6xl text-primary'>
          {isMalDown ? 'cloud_off' : 'error'}
        </span>
        <h1 className='text-2xl font-black sm:text-3xl'>
          {isMalDown ? 'La fuente de información no está disponible' : 'Ocurrió un error inesperado'}
        </h1>
        <p className='mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base'>
          {isMalDown
            ? 'MyAnimeList no está disponible en este momento. Tus listas y favoritos siguen seguros; probá nuevamente dentro de unos minutos.'
            : 'No pudimos completar esta solicitud. Podés intentar recargar la información.'}
        </p>
          <div className='mt-8 flex justify-center'>
            <button type="button"
              onClick={() => unstable_retry()}
              className='flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95'>
              <span className='material-symbols-outlined' style={{ fontVariationSettings: "'FILL' 1" }}>
                refresh
              </span>
              <span className='text-sm'>Reintentar</span>
            </button>
          </div>
      </section>
    </main>
  );
}
