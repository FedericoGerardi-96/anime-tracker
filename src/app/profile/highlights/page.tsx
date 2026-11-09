import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileHighlightsEditor from '@/components/profile/ProfileHighlightsEditor';
import { getMyProfileHighlights } from '@/services/profile-page';
import { getAuthenticatedUser } from '@/services/supabase';

export default async function ProfileHighlightsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  const items = await getMyProfileHighlights().catch(() => null);

  return <main className="mx-auto w-full max-w-7xl py-10">
    <nav className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Link href="/profile">Perfil</Link><span>›</span><span className="text-primary">Favoritos destacados</span></nav>
    <div className="mb-9"><p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Personalizá tu perfil</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">Tus favoritos destacados</h1><p className="mt-3 max-w-2xl text-muted-foreground">Elegí y ordená hasta 10 anime, 10 manga y 10 personajes. Esta selección es independiente de tu biblioteca.</p></div>
    {items ? <ProfileHighlightsEditor initialItems={items} /> : <p role="alert" className="text-muted-foreground">No pudimos cargar tu top. Recargá la página para volver a intentarlo.</p>}
  </main>;
}

