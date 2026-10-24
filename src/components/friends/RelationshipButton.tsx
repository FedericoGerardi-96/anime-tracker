'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeFriendship, respondFriendRequest, sendFriendRequest } from '@/lib/actions/social';
import type { PublicSocialProfile } from '@/services/social';

export default function RelationshipButton({ profile }: Readonly<{ profile: PublicSocialProfile }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (profile.relationship === 'self') return null;

  const run = (operation: () => Promise<{ error?: string }>) => startTransition(async () => {
    setError(null);
    const result = await operation();
    if (result.error) return setError(result.error);
    router.refresh();
  });

  let controls: React.ReactNode;
  if (profile.relationship === 'none') controls = <button type="button" onClick={() => run(() => sendFriendRequest(profile.id))} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Agregar amigo</button>;
  else if (profile.relationship === 'request_sent') controls = <button type="button" disabled={!profile.friendship_id} onClick={() => profile.friendship_id && run(() => removeFriendship(profile.friendship_id!))} className="rounded-xl border border-border px-5 py-3 text-sm font-bold">Cancelar solicitud</button>;
  else if (profile.relationship === 'request_received') controls = <div className="flex gap-2"><button type="button" onClick={() => profile.friendship_id && run(() => respondFriendRequest(profile.friendship_id!, false))} className="rounded-xl border border-border px-4 py-3 text-sm font-bold">Rechazar</button><button type="button" onClick={() => profile.friendship_id && run(() => respondFriendRequest(profile.friendship_id!, true))} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Aceptar solicitud</button></div>;
  else controls = <button type="button" onClick={() => profile.friendship_id && run(() => removeFriendship(profile.friendship_id!))} className="rounded-xl border border-primary/25 bg-primary/10 px-5 py-3 text-sm font-bold text-primary">Amigos</button>;

  return <div className={pending ? 'pointer-events-none opacity-60' : ''}>{controls}{error && <p className="mt-2 text-xs text-red-400">{error}</p>}</div>;
}

