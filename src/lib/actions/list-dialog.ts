'use server';
import { getListDialogData } from '@/services/list-dialog';
import type { ListDialogResult } from '@/interfaces/list-dialog';
export async function loadListDialog(malId: number, mediaType: 'anime' | 'manga'): Promise<ListDialogResult> {
  return getListDialogData(malId, mediaType);
}
