"use client";

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { GridSkeleton } from '@/components/fallbacks/PageSkeleton';

const LoadingContext = createContext<{ loading: boolean; setLoading: Dispatch<SetStateAction<boolean>> } | null>(null);

export function CatalogInteraction({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  return <LoadingContext.Provider value={{ loading, setLoading }}>{children}</LoadingContext.Provider>;
}

export function useCatalogLoading() {
  return useContext(LoadingContext);
}

export function CatalogResultsArea({ children }: { children: ReactNode }) {
  const loading = useCatalogLoading()?.loading ?? false;
  return <div className="min-w-0" aria-busy={loading}>
    {loading && <GridSkeleton />}
    <div hidden={loading}>{children}</div>
  </div>;
}
