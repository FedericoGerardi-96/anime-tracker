'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useClientSearch } from '@/hooks/useClientSearch';
import Loader from '@/components/ui/Loader';
import { removeFriendship, respondFriendRequest, sendFriendRequest } from '@/lib/actions/social';
import type { SocialConnection, SocialProfile } from '@/types/social';
import { DEFAULT_PROFILE_AVATAR, getProfileAvatar, profileAvatarBackground } from '@/lib/profile-avatar';

function Avatar({ profile }: Readonly<{ profile: Pick<SocialProfile, 'avatar' | 'full_name' | 'username'> }>) {
  const avatar = getProfileAvatar(profile.avatar) ?? DEFAULT_PROFILE_AVATAR;
  return <span role="img" aria-label={`Imagen de perfil de ${profile.full_name || profile.username}`} className="size-12 shrink-0 rounded-full bg-primary/15 bg-cover bg-center" style={{ backgroundImage: profileAvatarBackground(avatar) }} />;
}

function Person({ connection, action }: Readonly<{ connection: SocialConnection; action: React.ReactNode }>) {
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"><Avatar profile={connection} /><Link href={`/users/${connection.username}`} className="min-w-0 flex-1"><strong className="block truncate hover:text-primary">{connection.full_name || connection.username}</strong><span className="text-xs text-muted-foreground">@{connection.username}</span></Link>{action}</div>;
}

export default function FriendsClient({ initialConnections }: Readonly<{ initialConnections: SocialConnection[] }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const { data: results, loading: searching, error: searchError } = useClientSearch<SocialProfile>(query.trim().length >= 2 ? `/api/friends/search?q=${encodeURIComponent(query.trim())}` : null);
  const [message, setMessage] = useState<string | null>(null);
  const received = initialConnections.filter((item) => item.direction === 'received');
  const sent = initialConnections.filter((item) => item.direction === 'sent');
  const friends = initialConnections.filter((item) => item.direction === 'friend');


  const run = (operation: () => Promise<{ error?: string; success?: boolean }>) => startTransition(async () => {
    setMessage(null);
    const result = await operation();
    if (result.error) return setMessage(result.error);
    setQuery(''); router.refresh();
  });

  return <div className={pending ? 'pointer-events-none opacity-70' : ''}>
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <label htmlFor="people-search" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Buscar personas</label>
      <div className="relative mt-3"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">person_search</span><input id="people-search" value={query} onChange={(event) => { setQuery(event.target.value); setMessage(null); }} placeholder="Buscar por usuario o nombre…" className="h-12 w-full rounded-xl border border-border bg-background pl-12 pr-4 outline-none focus:border-primary" /></div>
      {searching && <Loader label="Buscando personas…" className="py-8" />}
      {!searching && results.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{results.map((profile) => <div key={profile.id} className="flex items-center gap-3 rounded-2xl border border-border p-3"><Avatar profile={profile} /><Link href={`/users/${profile.username}`} className="min-w-0 flex-1"><strong className="block truncate">{profile.full_name || profile.username}</strong><span className="text-xs text-muted-foreground">@{profile.username}</span></Link>{profile.relationship === 'none' && <button type="button" onClick={() => run(() => sendFriendRequest(profile.id))} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Agregar</button>}{profile.relationship === 'request_sent' && <span className="text-xs font-semibold text-muted-foreground">Enviada</span>}{profile.relationship === 'friends' && <span className="text-xs font-semibold text-primary">Amigos</span>}{profile.relationship === 'request_received' && <span className="text-xs font-semibold text-amber-500">Te agregó</span>}</div>)}</div>}
      {!searching && query.trim().length >= 2 && results.length === 0 && !message && !searchError && <p className="py-8 text-center text-sm text-muted-foreground">No encontramos usuarios con ese nombre.</p>}
    </section>

    {(message || searchError) && <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">{message || searchError}</p>}
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <section><h2 className="mb-4 flex items-center gap-2 text-xl font-black"><span className="material-symbols-outlined text-primary">person_add</span>Solicitudes recibidas <span className="text-sm text-muted-foreground">({received.length})</span></h2><div className="space-y-3">{received.length ? received.map((item) => <Person key={item.friendship_id} connection={item} action={<div className="flex gap-2"><button type="button" onClick={() => run(() => respondFriendRequest(item.friendship_id, false))} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Rechazar</button><button type="button" onClick={() => run(() => respondFriendRequest(item.friendship_id, true))} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Aceptar</button></div>} />) : <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No tenés solicitudes pendientes.</p>}</div></section>
        {sent.length > 0 && <section><h2 className="mb-4 text-lg font-black">Solicitudes enviadas</h2><div className="space-y-3">{sent.map((item) => <Person key={item.friendship_id} connection={item} action={<button type="button" onClick={() => run(() => removeFriendship(item.friendship_id))} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground">Cancelar</button>} />)}</div></section>}
      </div>
      <section><h2 className="mb-4 flex items-center gap-2 text-xl font-black"><span className="material-symbols-outlined text-primary">group</span>Mis amigos <span className="text-sm text-muted-foreground">({friends.length})</span></h2><div className="space-y-3">{friends.length ? friends.map((item) => <Person key={item.friendship_id} connection={item} action={<button type="button" onClick={() => run(() => removeFriendship(item.friendship_id))} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400" title="Eliminar amistad"><span className="material-symbols-outlined text-lg">person_remove</span></button>} />) : <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Todavía no agregaste amigos.</p>}</div></section>
    </div>
  </div>;
}
