'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogProvider } from '@/interfaces/anilist-catalog';

export default function ProviderChoice({ provider, failed = false, retryAfterMs = 0 }: { provider: CatalogProvider; failed?: boolean; retryAfterMs?: number }) {
  const router = useRouter();
  const [wait, setWait] = useState(Math.ceil(retryAfterMs / 1000));
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const [pending, startTransition] = useTransition();
  const name = provider === 'anilist' ? 'AniList' : 'MyAnimeList';
  function choose(value: CatalogProvider) {
    document.cookie = `catalog-provider=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    // Reload also clears prefetched results and suggestions from the previous engine.
    const url = new URL(location.href);
    if (/^\/(anime|manga|characters)\/?$/.test(url.pathname)) {
      const query = url.searchParams.get('q');
      url.search = '';
      if (query) url.searchParams.set('q', query);
    }
    location.assign(url.toString());
  }
  return <section className="rounded-xl border border-border bg-card p-4 space-y-3">
    {failed && <p role="alert" className="text-sm text-foreground">{retryAfterMs ? `${name} limitó las solicitudes. Esperá unos ${Math.ceil(retryAfterMs / 1000)} segundos antes de reintentar.` : `No pudimos completar esta consulta en ${name}. Puede ser un fallo temporal; no cambiamos de proveedor.`} ¿Querés consultar el otro catálogo?</p>}
    <label className="flex flex-wrap items-center gap-3 text-sm text-foreground">Motor de búsqueda
      <select aria-label="Motor de anime y manga" value={provider} onChange={event => choose(event.target.value as CatalogProvider)} className="rounded-lg border border-border bg-background p-2">
        <option value="anilist">AniList</option><option value="myanimelist">MyAnimeList</option>
      </select>
    </label>
    {failed && <button disabled={pending || wait > 0} onClick={() => startTransition(() => router.refresh())} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{wait > 0 ? `Reintentar en ${wait} s` : pending ? 'Consultando…' : `Reintentar ${name}`}</button>}
  </section>;
}
