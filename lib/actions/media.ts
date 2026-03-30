
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getFavoritesWithMedia() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select('id, media!inner(mal_id, title, image)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id as string,
    mal_id: row.media.mal_id as number,
    title: row.media.title as string,
    image: row.media.image as string,
  }))
}

export async function getFavoriteMalIds(): Promise<number[] | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('favorites')
    .select('media!inner(mal_id)')
    .eq('user_id', user.id)

  if (error || !data) return []

  return data.map((row: any) => row.media.mal_id)
}

export async function toggleFavorite(mediaData: {
  mal_id: number;
  title: string;
  image: string;
  type?: 'anime' | 'manga';
  synopsis?: string;
  season?: string;
  tags?: string[];
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

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
      await supabase.from('hentai').delete().eq('id', existingHentai.id);
      revalidatePath('/hentai');
      return { success: true, isFavorite: false };
    } else {
      await supabase.from('hentai').insert({
        user_id: user.id,
        mal_id: mediaData.mal_id,
        title: mediaData.title,
        image: mediaData.image,
        description: mediaData.synopsis,
        type: mediaData.type === 'manga' ? 'doujin' : 'anime'
      });
      revalidatePath('/hentai');
      return { success: true, isFavorite: true };
    }
  }

  // 1. Ensure media exists
  let mediaId: string;
  const { data: existingMedia } = await supabase
    .from('media')
    .select('id')
    .eq('mal_id', mediaData.mal_id)
    .single()

  if (existingMedia) {
    mediaId = existingMedia.id;
  } else {
    // Insert media
    const { data: newMedia, error: mediaError } = await supabase
      .from('media')
      .insert({
        mal_id: mediaData.mal_id,
        title: mediaData.title,
        type: mediaData.type || 'anime',
        image: mediaData.image,
        description: mediaData.synopsis,
        season: mediaData.season,
        tags: mediaData.tags || [],
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
  }

  revalidatePath('/anime')
  revalidatePath('/manga')
  revalidatePath('/favorites')
  revalidatePath('/profile')
  
  return { success: true, isFavorite: !existingFav }
}
