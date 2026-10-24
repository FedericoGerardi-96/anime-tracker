'use client';
import { loadListDialog } from '@/lib/actions/list-dialog';
import type { ListDialogResult } from '@/interfaces/list-dialog';

// Call from an event handler and retain the returned promise in state above Suspense.
// Resolve transport errors as data so the modal can offer a retry locally.
export function requestListDialog(malId: number, mediaType: 'anime' | 'manga'): Promise<ListDialogResult> {
  return loadListDialog(malId, mediaType).catch(() => ({ error: 'No pudimos conectar con el servidor. Intentá nuevamente.' }));
}
