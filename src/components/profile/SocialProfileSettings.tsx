'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSocialProfile } from '@/lib/actions/social';

interface Props { username: string; bio: string; discoverable: boolean; allowFriendRequests: boolean }

export default function SocialProfileSettings({ username: initialUsername, bio: initialBio, discoverable: initialDiscoverable, allowFriendRequests: initialAllow }: Readonly<Props>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [discoverable, setDiscoverable] = useState(initialDiscoverable);
  const [allowFriendRequests, setAllowFriendRequests] = useState(initialAllow);
  const [message, setMessage] = useState<string | null>(null);

  const save = () => startTransition(async () => {
    setMessage(null);
    const result = await updateSocialProfile({ username, bio, discoverable, allowFriendRequests });
    if (result.error) return setMessage(result.error);
    setMessage('Perfil social actualizado.'); router.refresh();
  });

  return <div className="max-w-3xl rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="mb-6"><h3 className="flex items-center gap-2 font-black"><span className="material-symbols-outlined text-primary">badge</span>Perfil social</h3><p className="mt-1 text-sm text-muted-foreground">Estos datos son los que otras personas utilizarán para encontrarte.</p></div>
    <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nombre de usuario</span><input value={username} maxLength={30} onChange={(event) => setUsername(event.target.value.replace(/[^A-Za-z0-9_]/g, ''))} className="h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary" /><small className="text-muted-foreground">Entre 3 y 30 letras, números o guiones bajos.</small></label><label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Biografía</span><textarea value={bio} maxLength={300} onChange={(event) => setBio(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-border bg-background p-4 outline-none focus:border-primary" /><small className="block text-right text-muted-foreground">{bio.length}/300</small></label></div>
    <div className="mt-5 space-y-3"><Toggle checked={discoverable} onChange={setDiscoverable} label="Aparecer en las búsquedas" description="Si lo desactivás, las personas no podrán encontrar tu perfil."/><Toggle checked={allowFriendRequests} onChange={setAllowFriendRequests} disabled={!discoverable} label="Permitir solicitudes de amistad" description="Los amigos actuales no se ven afectados."/></div>
    <div className="mt-6 flex items-center justify-end gap-3">{message && <span className={`mr-auto text-sm ${message.includes('actualizado') ? 'text-emerald-500' : 'text-red-400'}`}>{message}</span>}<button type="button" disabled={pending || username.length < 3} onClick={save} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">{pending ? 'Guardando…' : 'Guardar perfil social'}</button></div>
  </div>;
}

function Toggle({ checked, onChange, label, description, disabled }: Readonly<{ checked: boolean; onChange: (value: boolean) => void; label: string; description: string; disabled?: boolean }>) {
  return <label className={`flex items-center gap-4 rounded-2xl border border-border p-4 ${disabled ? 'opacity-45' : 'cursor-pointer'}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-primary"/><span><strong className="block text-sm">{label}</strong><small className="text-muted-foreground">{description}</small></span></label>;
}
