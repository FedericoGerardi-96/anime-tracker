'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { unfollowSharedList } from '@/lib/actions/list-sharing';
import { useToast } from '@/components/ui/Toast';

export default function UnfollowListButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return <button type="button" disabled={pending} onClick={() => startTransition(async () => {
    try {
      const result = await unfollowSharedList(id);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Dejaste de seguir la lista.');
        router.refresh();
      }
    } catch {
      toast.error('No pudimos quitar la lista. Volvé a intentar.');
    }
  })} className="min-h-11 shrink-0 cursor-pointer rounded-xl border border-border px-4 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">
    {pending ? 'Guardando…' : 'Dejar de seguir'}
  </button>;
}
