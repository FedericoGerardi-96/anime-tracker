'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { readLibraryEditor } from '@/lib/actions/library-editor';
import { editorSnapshotFromRow, type EditorSnapshot, type LibraryRow } from '@/lib/library-editor';
import LibraryEditorForm from './LibraryEditorForm';
import LibraryEditorSkeleton from '@/components/fallbacks/LibraryEditorSkeleton';
import styles from './LibraryEditor.module.css';

export default function LibraryEditor({ row, open, onClose, onReopen, onSaved }: { row: LibraryRow; open: boolean; onClose: () => void; onReopen: () => void; onSaved: () => void }) {
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(() => editorSnapshotFromRow(row));
  const [error, setError] = useState('');
  useEffect(() => {
    if (row.editorVersion) return;
    let active = true;
    readLibraryEditor(row.id).then(result => {
      if (!active) return;
      if ('error' in result) setError(result.error);
      else setSnapshot(result.data);
    }).catch(() => { if (active) setError('No pudimos cargar el editor. Cerrá y volvé a intentar.'); });
    return () => { active = false; };
  }, [row.id, row.editorVersion]);
  if (snapshot) return <LibraryEditorForm row={row} initialSnapshot={snapshot} open={open} onClose={onClose} onReopen={onReopen} onSaved={onSaved} />;
  if (!open) return null;
  return <Modal onClose={onClose} label={'Editar ' + row.title} className="p-0!">
    <aside className="ml-auto h-full w-full max-w-lg overflow-y-auto border-l border-border bg-background p-6" onClick={event => event.stopPropagation()}>
      <header className="mb-8 flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{row.title}</h2><button type="button" onClick={onClose} aria-label="Cerrar editor" className={styles.control + ' ' + styles.square + ' border'}>×</button></header>
      {error ? <p role="alert">{error}</p> : <LibraryEditorSkeleton />}
    </aside>
  </Modal>;
}
