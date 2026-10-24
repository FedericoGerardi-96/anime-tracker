import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) return Response.json({ data: [] });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const { data, error } = await supabase.rpc('search_profiles', { search_term: query, result_limit: 10 });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data: data ?? [] });
}

