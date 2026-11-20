'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteHentaiEntry } from '@/lib/actions/hentai';
import { useToast } from '@/components/ui/Toast';

export default function DeleteHentaiButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { success, error } = useToast();
  const remove = async () => {
    if (!confirm(`¿Quitar “${title}” de tu colección? También se eliminarán su nota y su enlace.`)) return;
    setPending(true);
    try {
      const result = await deleteHentaiEntry(id);
      if (result.error) error(result.error);
      else { success('Título quitado de tu colección.'); router.refresh(); }
    } catch { error('No pudimos quitar el título. Volvé a intentar.'); }
    finally { setPending(false); }
  };
  return <button type="button" onClick={remove} disabled={pending} aria-label={`Quitar ${title}`} title="Quitar de la colección"
    className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40">
    <span aria-hidden="true" className="material-symbols-outlined text-lg">{pending ? 'sync' : 'delete'}</span>
  </button>;
}
