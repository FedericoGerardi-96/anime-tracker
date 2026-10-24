import 'server-only';

import { getSupabaseServer } from '@/services/supabase';
import type { ProfileHighlight } from '@/types/profile-highlights';

export interface PublicSocialProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar: string | null;
  bio: string | null;
  relationship: 'self' | 'none' | 'friends' | 'request_sent' | 'request_received';
  friendship_id: string | null;
  can_view_library: boolean;
  can_view_featured_anime: boolean;
  can_view_featured_manga: boolean;
  can_view_featured_characters: boolean;
}

interface VisibleFavoriteRow {
  favorite_id: string;
  favorite_created_at: string;
  media_id: string;
  mal_id: number;
  title: string;
  media_type: string;
  image: string;
  release_year: number | null;
  media_format: string | null;
  score: number | null;
  total_count: number;
}

interface VisibleHighlightRow extends Omit<ProfileHighlight, 'position'> {
  highlight_position: number;
  anilist_id: number | null;
  mal_id: number | null;
}

export async function getSocialProfile(username: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('get_social_profile', { profile_username: username });
  if (error) throw error;
  return (data?.[0] ?? null) as PublicSocialProfile | null;
}

export async function getVisibleHighlights(userId: string) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('get_visible_profile_highlights', { target_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as VisibleHighlightRow[]).map(({ highlight_position, ...item }) => ({
    ...item,
    position: highlight_position,
  }));
}

export async function getVisibleFavorites(userId: string, page = 1, pageSize = 20) {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc('get_visible_profile_favorites', {
    target_user_id: userId,
    page_number: page,
    page_size: pageSize,
  });
  if (error) throw error;
  const rows = (data ?? []) as VisibleFavoriteRow[];
  const total = Number(rows[0]?.total_count ?? 0);
  const items = rows.map((row) => ({
    id: row.favorite_id,
    created_at: row.favorite_created_at,
    media: {
      id: row.media_id,
      mal_id: row.mal_id,
      title: row.title,
      type: row.media_type,
      image: row.image,
      year: row.release_year,
      format: row.media_format,
      score: row.score,
    },
  }));
  return { items, total, totalPages: Math.ceil(total / pageSize) };
}
