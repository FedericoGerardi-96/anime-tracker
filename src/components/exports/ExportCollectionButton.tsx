'use client';

import { useState } from 'react';
import type { ExportSource } from '@/lib/library-export';
import ExportCollectionModal from './ExportCollectionModal';

export default function ExportCollectionButton({ source }: { source: ExportSource }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-(--radius-control) border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted">
      <span aria-hidden="true" className="material-symbols-outlined text-lg">table_chart</span>Exportar a Excel
    </button>
    {open && <ExportCollectionModal source={source} onClose={() => setOpen(false)} />}
  </>;
}
