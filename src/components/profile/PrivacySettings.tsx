'use client';

import { useState, useTransition } from 'react';
import Dropdown from '@/components/dropdown/dropdown';
import { updateProfilePrivacy } from '@/lib/actions/social';
import type { ProfilePrivacy, VisibilityLevel } from '@/types/social';

const OPTIONS = [
  { value: 'public', label: 'Público', icon: <span className="material-symbols-outlined text-base">public</span> },
  { value: 'friends', label: 'Sólo amigos', icon: <span className="material-symbols-outlined text-base">group</span> },
  { value: 'private', label: 'Sólo yo', icon: <span className="material-symbols-outlined text-base">lock</span> },
];

const FIELDS: Array<{ key: keyof ProfilePrivacy; label: string; description: string }> = [
  { key: 'library_favorites_visibility', label: 'Mi biblioteca de favoritos', description: 'Los anime y manga guardados con el corazón.' },
  { key: 'featured_anime_visibility', label: 'Anime destacados', description: 'Tu top personal de anime.' },
  { key: 'featured_manga_visibility', label: 'Manga destacados', description: 'Tu top personal de manga.' },
  { key: 'featured_characters_visibility', label: 'Personajes destacados', description: 'Tu selección de personajes favoritos.' },
];

export default function PrivacySettings({ initialSettings }: Readonly<{ initialSettings: ProfilePrivacy }>) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const changed = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const save = () => startTransition(async () => {
    setMessage(null);
    const result = await updateProfilePrivacy(settings);
    if (result.error) return setMessage(result.error);
    setSavedSettings(settings);
    setMessage('Privacidad actualizada.');
  });

  return <div className="max-w-3xl rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="mb-6"><h3 className="flex items-center gap-2 font-black"><span className="material-symbols-outlined text-primary">shield_lock</span>Privacidad del perfil</h3><p className="mt-1 text-sm text-muted-foreground">Elegí quién puede ver cada parte de tu colección.</p></div>
    <div className="divide-y divide-border">{FIELDS.map((field) => <div key={field.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{field.label}</p><p className="text-xs text-muted-foreground">{field.description}</p></div><Dropdown ariaLabel={`Privacidad de ${field.label}`} options={OPTIONS} value={settings[field.key]} onChange={(value) => setSettings((current) => ({ ...current, [field.key]: value as VisibilityLevel }))} className="sm:w-44!" buttonClassName="sm:w-44!" /></div>)}</div>
    <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{message && <span className={`mr-auto text-sm ${message.includes('actualizada') ? 'text-emerald-500' : 'text-red-400'}`}>{message}</span>}<button type="button" disabled={!changed || pending} onClick={save} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">{pending ? 'Guardando…' : 'Guardar privacidad'}</button></div>
  </div>;
}
