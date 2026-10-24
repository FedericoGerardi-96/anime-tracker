import type { ReactNode } from 'react';

export interface DialogList { id: string; name: string; description?: string | null }
export interface DialogMedia {
  mal_id: number; title: string; image: string; type: 'anime' | 'manga';
  synopsis?: string; season?: string; year?: number; genres?: string[]; tags?: string[];
  format?: string; status?: string; totalUnits?: number; episodes?: number; score?: number;
}
export interface ListDialogData {
  lists: DialogList[];
  listIds: string[];
  progress: { status: string; current_episode: number } | null;
}
export type ListDialogResult = { data: ListDialogData; error?: never } | { data?: never; error: string };
export interface AddToListModalProps {
  isOpen: boolean; onClose: () => void; onListCreated?: () => void;
  mode?: 'create' | 'add-anime'; animeData?: DialogMedia;
  dataPromise?: Promise<ListDialogResult> | null;
}
export interface ListDialogFormProps extends AddToListModalProps { initialData: ListDialogData }
export interface ResolvedListDialogProps extends AddToListModalProps {
  dataPromise: Promise<ListDialogResult>;
  renderError: (message: string) => ReactNode;
}
