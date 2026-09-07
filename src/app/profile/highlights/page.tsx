import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProfileHighlightsEditor from '@/components/profile/ProfileHighlightsEditor';
import type { ProfileHighlight } from '@/types/profile-highlights';

export default async function ProfileHighlightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('profile_highlights').select('id, category, external_id, title, subtitle, image_url, position').eq('user_id', user.id).order('position');

  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <nav className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/profile">Perfil</Link><span>›</span><span className="text-primary">Favoritos destacados</span></nav>
    <div className="mb-9"><p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Personalizá tu perfil</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">Tus favoritos destacados</h1><p className="mt-3 max-w-2xl text-muted-foreground">Elegí y ordená hasta 10 anime, 10 manga y 10 personajes. Esta selección es independiente de tu biblioteca.</p></div>
    <ProfileHighlightsEditor initialItems={(data ?? []) as ProfileHighlight[]} />
  </main>;
}

