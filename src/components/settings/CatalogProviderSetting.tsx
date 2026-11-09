"use client";

import { useActionState } from 'react';
import { saveCatalogProvider } from '@/lib/actions/catalog-provider';
import type { CatalogProvider } from '@/interfaces/anilist-catalog';

export default function CatalogProviderSetting({ provider }: { provider: CatalogProvider }) {
  const [result, save, pending] = useActionState(saveCatalogProvider, null);
  return (
    <section aria-labelledby="catalog-provider-heading" className="rounded-(--radius-panel) border border-border bg-card p-5">
      <h3 id="catalog-provider-heading" className="font-bold">Fuente de búsqueda</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Elegí de dónde vienen los resultados de anime, manga y personajes en el catálogo y el buscador. La elección se guarda en este navegador.
      </p>
      <form action={save} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 gap-1 text-sm font-semibold">
          Proveedor
          <select
            key={provider}
            name="provider"
            defaultValue={provider}
            disabled={pending}
            className="min-h-11 max-w-full rounded-(--radius-control) border border-border bg-background px-3"
          >
            <option value="anilist">AniList</option>
            <option value="myanimelist">MyAnimeList</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="min-h-11 rounded-(--radius-control) bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {pending ? 'Guardando…' : 'Guardar fuente'}
        </button>
      </form>
      {result && !pending && <p role={result.error ? 'alert' : 'status'} className="mt-3 text-sm text-foreground">{result.message}</p>}
    </section>
  );
}
