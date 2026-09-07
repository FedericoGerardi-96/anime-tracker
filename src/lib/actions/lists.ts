
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getValidMalAccessToken, MalConnectionNotFoundError } from '@/services/myanimelist-connection'
import { setMalAnimeProgress, setMalMangaProgress } from '@/services/myanimelist-library'
import { getCanonicalMediaInput } from '@/services/canonical-media'

const PROGRESS_STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'] as const
type ProgressStatus = typeof PROGRESS_STATUSES[number]

function toMalMangaStatus(status: ProgressStatus) {
  if (status === 'watching') return 'reading' as const
  if (status === 'plan_to_watch') return 'plan_to_read' as const
  return status
}

export async function updatePersonalProgress(input: { mediaId: string; malId: number; mediaType: 'anime' | 'manga'; status: ProgressStatus; currentEpisode?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }
  if (!PROGRESS_STATUSES.includes(input.status) || !Number.isInteger(input.currentEpisode ?? 0) || (input.currentEpisode ?? 0) < 0) return { error: 'Progreso inválido' }

  let currentEpisode = input.currentEpisode ?? 0
  if (input.status === 'completed') {
    const { data: media } = await supabase
      .from('media')
      .select('total_units')
      .eq('id', input.mediaId)
      .single()

    if (media?.total_units) currentEpisode = media.total_units
  }
  const { error } = await supabase.from('user_anime_progress').upsert({ user_id: user.id, media_id: input.mediaId, status: input.status, current_episode: currentEpisode, updated_at: new Date().toISOString() }, { onConflict: 'user_id,media_id' })
  if (error) return { error: error.message }

  let warning: string | undefined
  try {
    const token = await getValidMalAccessToken(user.id)
    if (input.mediaType === 'manga') await setMalMangaProgress(token, input.malId, toMalMangaStatus(input.status), currentEpisode)
    else await setMalAnimeProgress(token, input.malId, input.status, currentEpisode)
  } catch (syncError) {
    if (!(syncError instanceof MalConnectionNotFoundError)) {
      console.error('No se pudo sincronizar el progreso con MyAnimeList:', syncError)
      warning = 'El progreso se guardó en AniTrack, pero MyAnimeList no pudo actualizarse.'
    }
  }
  revalidatePath('/favorites')
  revalidatePath('/lists')
  revalidatePath('/profile')
  return { success: true, warning }
}

export async function getLists() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching lists:', error)
    return { error: error.message, data: null }
  }

  return { error: null, data }
}

export async function getMediaListAssociations(malId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: associations, error: assocError } = await supabase
    .from('list_media')
    .select('list_id, media!inner(mal_id)')
    .eq('media.mal_id', malId)

  if (assocError || !associations) {
    console.error('Error fetching associations:', assocError)
    return []
  }

  return associations.map((a: any) => a.list_id)
}

export async function getMediaProgress(malId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_anime_progress')
    .select('status, current_episode, media!inner(mal_id)')
    .eq('media.mal_id', malId)
    .single()

  if (error || !data) return null

  return {
    status: data.status,
    current_episode: data.current_episode
  }
}

export async function getMediaByProgressStatus(status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('user_anime_progress')
    .select(`
      id,
      status,
      current_episode,
      updated_at,
      media ( id, mal_id, title, image, type, season, year, genres, tags, format, status, total_units, description, score )
    `)
    .eq('user_id', user.id)
    .eq('status', status)
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error(`Error fetching progress for status ${status}:`, error)
    return []
  }

  return data
}

export async function getListMedia(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // Check if user owns list or if it's public (we only check strictly for user here to keep it simple)
  // But usually we just fetch the items
  const { data, error } = await supabase
    .from('list_media')
    .select(`
      id,
      created_at,
      media ( id, mal_id, title, image, type, season, year, genres, tags, format, status, total_units, description, score )
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error(`Error fetching media for list ${listId}:`, error)
    return []
  }

  return data
}

export async function createList(name: string, description?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const { data, error } = await supabase
    .from('lists')
    .insert([{ 
      name, 
      description, 
      user_id: user.id 
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating list:', error)
    return { error: error.message, data: null }
  }

  revalidatePath('/lists')
  return { error: null, data }
}

export async function addMediaToLists(mediaData: {
  mal_id: number;
  title: string;
  image: string;
  type: 'anime' | 'manga';
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
}, listIds: string[], progressData?: {
  status?: string;
  current_episode?: number;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 1. Ensure media exists
  let mediaId: string;
  const { data: existingMedia } = await supabase
    .from('media')
    .select('id')
    .eq('mal_id', mediaData.mal_id)
    .eq('type', mediaData.type)
    .single()

  if (existingMedia) {
    mediaId = existingMedia.id;
  } else {
    const canonical = await getCanonicalMediaInput(mediaData)
    const { data: newMedia, error: mediaError } = await supabase
      .from('media')
      .insert({
        mal_id: canonical.mal_id, title: canonical.title, type: canonical.type || mediaData.type,
        image: canonical.image, description: canonical.synopsis, season: canonical.season,
        year: canonical.year || null, genres: canonical.genres || [], tags: [],
        format: canonical.format || null, status: canonical.status || null,
        day: canonical.day || null, total_units: canonical.totalUnits || null, score: canonical.score || 0,
      })
      .select('id')
      .single()

    if (mediaError || !newMedia) {
      console.error('Error inserting media:', mediaError);
      return { error: 'Failed to insert media' }
    }
    mediaId = newMedia.id;
  }

  // 2. Update Progress if provided
  if (progressData) {
    let currentEpisode = progressData.current_episode || 0
    if (progressData.status === 'completed') {
      const { data: media } = await supabase
        .from('media')
        .select('total_units')
        .eq('id', mediaId)
        .single()

      if (media?.total_units) currentEpisode = media.total_units
    }

    const { error: progressError } = await supabase
      .from('user_anime_progress')
      .upsert({
        user_id: user.id,
        media_id: mediaId,
        status: progressData.status,
        current_episode: currentEpisode,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,media_id' })

    if (progressError) {
      console.error('Error updating progress:', progressError)
    }
  }

  // 3. Update associations
  const { data: userLists } = await supabase.from('lists').select('id').eq('user_id', user.id)
  const userListIds = userLists?.map(l => l.id) || []

  if (userListIds.length > 0) {
    await supabase
      .from('list_media')
      .delete()
      .eq('media_id', mediaId)
      .in('list_id', userListIds)
  }

  const insertions = listIds.map(listId => ({
    list_id: listId,
    media_id: mediaId
  }))

  if (insertions.length > 0) {
    const { error: insertError } = await supabase
      .from('list_media')
      .insert(insertions)

    if (insertError) {
      console.error('Error adding to lists:', insertError)
      return { error: 'Failed to add to lists' }
    }
  }

  revalidatePath('/lists')
  revalidatePath('/anime')
  revalidatePath('/manga')
  
  return { success: true }
}

export async function getProgressStats(): Promise<Record<string, number> | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_anime_progress')
    .select('status')
    .eq('user_id', user.id)

  if (error || !data) return null

  const counts: Record<string, number> = {
    watching: 0,
    completed: 0,
    on_hold: 0,
    dropped: 0,
    plan_to_watch: 0,
  }

  data.forEach(row => {
    if (row.status in counts) counts[row.status]++
  })

  return counts
}

// Keep aliases for backward compatibility, explicitly async as required by Next.js Server Actions
export async function getAnimeListAssociations(malId: number) {
  return getMediaListAssociations(malId);
}

export async function getAnimeProgress(malId: number) {
  return getMediaProgress(malId);
}

export async function addAnimeToLists(data: any, listIds: string[], progress: any) {
  return addMediaToLists({ ...data, type: data.type === 'manga' ? 'manga' : 'anime' }, listIds, progress);
}
