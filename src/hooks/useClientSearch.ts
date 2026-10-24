'use client';

import { useEffect, useState } from 'react';
import type { ClientSearchState } from '@/interfaces/client-search';

export function useClientSearch<T>(url: string | null, delay = 350) {
  const [state, setState] = useState<ClientSearchState<T>>({ url, data: [], loading: url !== null, error: null });

  // Reset before rendering consumers, including when returning to a previous query.
  if (state.url !== url) {
    setState({ url, data: [], loading: url !== null, error: null });
  }

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const payload = await response.json() as { data?: T[]; error?: string };
        if (!response.ok) throw new Error(payload.error || 'No se pudo completar la búsqueda.');
        if (!controller.signal.aborted) setState({ url, data: payload.data ?? [], loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ url, data: [], loading: false, error: error instanceof Error ? error.message : 'No se pudo completar la búsqueda.' });
      }
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [url, delay]);

  return state;
}
