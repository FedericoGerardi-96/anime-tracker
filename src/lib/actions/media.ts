"use server"

import { getAuthenticatedUser } from "@/services/supabase"
import { getFavoritesWithMedia as fetchFavoritesWithMedia, getFavoriteMalIds as fetchFavoriteMalIds, getAllFavoritesFull } from "@/services/favorites"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { syncMediaFavoriteWithProviders } from "@/services/media-provider-sync"
import { getCanonicalMediaInput } from '@/services/canonical-media'

async function syncFavoriteIfApplicable(
  userId: string,
  mediaData: { mal_id: number; type?: 'anime' | 'manga' },
  isFavorite: boolean,
) {
  const result = await syncMediaFavoriteWithProviders(userId, mediaData.mal_id, mediaData.type ?? 'anime', isFavorite);
  return result.warning;
}

export async function getFavoritesWithMedia() {
  const user = await getAuthenticatedUser()

  if (!user) return []

  return fetchFavoritesWithMedia(user.id)
}

export async function getFavoriteMalIds(): Promise<number[] | null> {
  const user = await getAuthenticatedUser()

  if (!user) return null

  return fetchFavoriteMalIds(user.id)
}

export async function toggleFavorite(mediaData: {
  mal_id: number;
  title: string;
  image: string;
  type?: 'anime' | 'manga';
  synopsis?: string;
  season?: string;
  year?: number;
  genres?: string[];
  tags?: string[];
  format?: string;
  status?: string;
  day?: string;
  totalUnits?: number;
  score?: number;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }
  if (!Number.isInteger(mediaData.mal_id) || mediaData.mal_id <= 0 || (mediaData.type && mediaData.type !== 'anime' && mediaData.type !== 'manga')) return { error: 'Serie inválida' }

  // 0. Check if media is Hentai
  const isHentai = mediaData.tags?.some(tag => tag.toLowerCase() === 'hentai');

  if (isHentai) {
    // Handle toggle in hentai table
    const { data: existingHentai } = await supabase
      .from('hentai')
      .select('id')
      .eq('user_id', user.id)
      .eq('mal_id', mediaData.mal_id)
      .single();

    if (existingHentai) {
      const { error } = await supabase.from('hentai').delete().eq('id', existingHentai.id);
      if (error) return { error: 'No se pudo quitar el favorito' };
      const warning = await syncFavoriteIfApplicable(user.id, mediaData, false);
      revalidatePath('/hentai');
      return { success: true, isFavorite: false, warning };
    } else {
      const { error } = await supabase.from('hentai').insert({
        user_id: user.id,
        mal_id: mediaData.mal_id,
        title: mediaData.title,
        image: mediaData.image,
        description: mediaData.synopsis,
        type: mediaData.type === 'manga' ? 'doujin' : 'anime'
      });
      if (error) return { error: 'No se pudo agregar el favorito' };
      const warning = await syncFavoriteIfApplicable(user.id, mediaData, true);
      revalidatePath('/hentai');
      return { success: true, isFavorite: true, warning };
    }
  }

  // 1. Ensure media exists
  let mediaId: string;
  const { data: existingMedia } = await supabase
    .from('media')
    .select('id')
    .eq('mal_id', mediaData.mal_id)
    .eq('type', mediaData.type || 'anime')
    .single()

  if (existingMedia) {
    mediaId = existingMedia.id;
  } else {
    const canonical = await getCanonicalMediaInput(mediaData)
    // Insert media
    const { data: newMedia, error: mediaError } = await supabase
      .from('media')
      .insert({
        mal_id: canonical.mal_id, title: canonical.title, type: canonical.type || 'anime', image: canonical.image,
        season: canonical.season, year: canonical.year || null,
        genres: canonical.genres || [], format: canonical.format || null,
        status: canonical.status || null, day: canonical.day || null,
        total_units: canonical.totalUnits || null, score: canonical.score || 0,
      })
      .select('id')
      .single()

    if (mediaError || !newMedia) {
      console.error('Error inserting media:', mediaError);
      return { error: 'Failed to insert media' }
    }
    mediaId = newMedia.id;
  }

  // 2. Toggle favorite
  const { data: existingFav } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('media_id', mediaId)
    .single()

  if (existingFav) {
    // Remove
    const { error: deleteError } = await supabase.from('favorites').delete().eq('id', existingFav.id)
    if (deleteError) {
      console.error('Error removing favorite:', deleteError)
      return { error: 'Failed to remove favorite' }
    }
  } else {
    // Add
    const { error: insertError } = await supabase.from('favorites').insert({
      user_id: user.id,
      media_id: mediaId
    })
    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return { error: 'Failed to add favorite' }
    }
    const { error: progressError } = await supabase.from('user_media_progress').upsert({
      user_id: user.id,
      media_id: mediaId,
      status: 'plan_to_watch',
      current_episode: 0,
      custom_tags: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,media_id', ignoreDuplicates: true })
    if (progressError) {
      console.error('Error creating personal media state:', progressError)
      return { error: 'Favorite added, but its personal state could not be created' }
    }
  }

  revalidatePath('/anime')
  revalidatePath('/manga')
  revalidatePath('/favorites')
  revalidatePath('/profile')

  const warning = await syncFavoriteIfApplicable(user.id, mediaData, !existingFav);
  
  return { success: true, isFavorite: !existingFav, warning }
}

export async function exportFavoritesAction() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");
  
  const data = await getAllFavoritesFull(user.id);
  return data.map((fav) => {
    const media = Array.isArray(fav.media) ? fav.media[0] : fav.media;
    return {
      "ID": fav.id,
      "MAL ID": media?.mal_id,
      "Title": media?.title,
      "Type": media?.type ? media.type.toUpperCase() : "",
      "Score": media?.score || 0,
      "Season": media?.season || "",
      "Year": media?.year || "",
      "Format": media?.format || "",
      "Status": media?.status || "",
      "Genres": Array.isArray(media?.genres) ? media.genres.join(", ") : "",
    };
  });
}
