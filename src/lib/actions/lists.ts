
'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/services/supabase'
import { revalidatePath } from 'next/cache'
import { syncMediaProgressWithProviders } from '@/services/media-provider-sync'
import { getCanonicalMediaInput } from '@/services/canonical-media'

const PROGRESS_STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'] as const
type ProgressStatus = typeof PROGRESS_STATUSES[number]

export async function updatePersonalProgress(input: { mediaId: string; malId: number; mediaType: 'anime' | 'manga'; status: ProgressStatus; currentEpisode?: number }) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return { error: 'No autorizado' }
  if (!PROGRESS_STATUSES.includes(input.status) || !Number.isInteger(input.currentEpisode ?? 0) || (input.currentEpisode ?? 0) < 0) return { error: 'Progreso inválido' }
  const { data: media, error: mediaError } = await supabase.from('media').select('mal_id,type,total_units').eq('id', input.mediaId).single()
  if (mediaError || !media || Number(media.mal_id) !== input.malId || media.type !== input.mediaType) return { error: 'No se pudo verificar la identidad de la serie' }

  let currentEpisode = input.currentEpisode ?? 0
  if (input.status === 'completed') {
    if (media?.total_units) currentEpisode = media.total_units
  }
  const { error } = await supabase.from('user_media_progress').upsert({ user_id: user.id, media_id: input.mediaId, status: input.status, current_episode: currentEpisode, updated_at: new Date().toISOString() }, { onConflict: 'user_id,media_id' })
  if (error) return { error: error.message }

  const { warning } = await syncMediaProgressWithProviders(user.id, { malId: Number(media.mal_id), mediaType: media.type, status: input.status, progress: currentEpisode })
  revalidatePath('/favorites')
  revalidatePath('/lists')
  revalidatePath('/profile')
  return { success: true, warning }
}

export async function getLists() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

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

export async function getMediaListAssociations(malId: number, mediaType: 'anime' | 'manga') {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

  if (!user) return []

  const { data: associations, error: assocError } = await supabase
    .from('list_media')
    .select('list_id, media!inner(mal_id, type), lists!inner(user_id)')
    .eq('media.mal_id', malId)
    .eq('media.type', mediaType)
    .eq('lists.user_id', user.id)

  if (assocError || !associations) {
    console.error('Error fetching associations:', assocError)
    return []
  }

  return associations.map((a) => a.list_id)
}

export async function getMediaProgress(malId: number, mediaType: 'anime' | 'manga') {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_media_progress')
    .select('status, current_episode, media!inner(mal_id, type)')
    .eq('media.mal_id', malId)
    .eq('media.type', mediaType)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null

  return {
    status: data.status,
    current_episode: data.current_episode
  }
}

export async function getMediaByProgressStatus(status: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('user_media_progress')
    .select(`
      id,
      status,
      current_episode,
      custom_description,
      custom_tags,
      watch_link,
      updated_at,
      media ( id, mal_id, title, image, type, season, year, genres, format, status, total_units, score )
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
  const user = await getAuthenticatedUser()

  if (!user) return []

  // Check if user owns list or if it's public (we only check strictly for user here to keep it simple)
  // But usually we just fetch the items
  const { data, error } = await supabase
    .from('list_media')
    .select(`
      id,
      created_at,
      media ( id, mal_id, title, image, type, season, year, genres, format, status, total_units, score )
    `)
    .eq('list_id', listId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error(`Error fetching media for list ${listId}:`, error)
    return []
  }

  const mediaIds = data.flatMap((item) => {
    const media = Array.isArray(item.media) ? item.media[0] : item.media
    return media?.id ? [media.id] : []
  })
  if (!mediaIds.length) return data
  const { data: personalRows } = await supabase.from('user_media_progress')
    .select('media_id, status, current_episode, custom_description, custom_tags, watch_link, updated_at')
    .eq('user_id', user.id)
    .in('media_id', mediaIds)
  const personalByMedia = new Map((personalRows ?? []).map((row) => [row.media_id, row]))
  return data.map((item) => {
    const media = Array.isArray(item.media) ? item.media[0] : item.media
    return { ...item, ...(media?.id ? personalByMedia.get(media.id) : undefined) }
  })
}

export async function createList(name: string, description?: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

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
  const user = await getAuthenticatedUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }
  if (!Number.isInteger(mediaData.mal_id) || mediaData.mal_id <= 0 || (mediaData.type !== 'anime' && mediaData.type !== 'manga')) return { error: 'Serie inválida' }

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
        image: canonical.image, season: canonical.season,
        year: canonical.year || null, genres: canonical.genres || [],
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

  let warning: string | undefined
  // 2. Update Progress if provided
  if (progressData) {
    const previous = await supabase.from('user_media_progress').select('status,current_episode').eq('user_id', user.id).eq('media_id', mediaId).maybeSingle()
    if (previous.error) return { error: 'No se pudo leer el progreso actual' }
    const status = progressData.status || previous.data?.status || 'plan_to_watch'
    if (!PROGRESS_STATUSES.includes(status as ProgressStatus)) return { error: 'Estado inválido' }
    let currentEpisode = progressData.current_episode ?? previous.data?.current_episode ?? 0
    if (!Number.isInteger(currentEpisode) || currentEpisode < 0) return { error: 'Progreso inválido' }
    if (status === 'completed') {
      const { data: media } = await supabase
        .from('media')
        .select('total_units')
        .eq('id', mediaId)
        .single()

      if (media?.total_units) currentEpisode = media.total_units
    }

    const { error: progressError } = await supabase
      .from('user_media_progress')
      .upsert({
        user_id: user.id,
        media_id: mediaId,
        status,
        current_episode: currentEpisode,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,media_id' })

    if (progressError) {
      console.error('Error updating progress:', progressError)
      return { error: 'No se pudo guardar el progreso' }
    }
    const result = await syncMediaProgressWithProviders(user.id, { malId: mediaData.mal_id, mediaType: mediaData.type, status: status as ProgressStatus, progress: currentEpisode })
    warning = result.warning
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
  revalidatePath('/favorites')
  revalidatePath('/profile')
  
  return { success: true, warning }
}

export async function getProgressStats(): Promise<Record<string, number> | null> {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('user_media_progress')
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

type MediaProgressType = 'anime' | 'manga'
type ProgressCounts = Record<ProgressStatus, number>

function emptyProgressCounts(): ProgressCounts {
  return {
    watching: 0,
    completed: 0,
    on_hold: 0,
    dropped: 0,
    plan_to_watch: 0,
  }
}

export async function getProgressStatsByType(): Promise<Record<MediaProgressType, ProgressCounts> | null> {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return null

  const counts = { anime: emptyProgressCounts(), manga: emptyProgressCounts() }
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('user_media_progress')
      .select('status, media!inner(type)')
      .eq('user_id', user.id)
      .order('id')
      .range(offset, offset + pageSize - 1)

    if (error || !data) {
      console.error('Error fetching progress stats by media type:', error)
      return null
    }

    for (const row of data) {
      const media = Array.isArray(row.media) ? row.media[0] : row.media
      const type = media?.type as MediaProgressType | undefined
      const status = row.status as ProgressStatus
      if ((type === 'anime' || type === 'manga') && PROGRESS_STATUSES.includes(status)) {
        counts[type][status]++
      }
    }

    if (data.length < pageSize) break
  }

  return counts
}

// Keep aliases for backward compatibility, explicitly async as required by Next.js Server Actions
export async function getAnimeListAssociations(malId: number) {
  return getMediaListAssociations(malId, 'anime');
}

export async function getAnimeProgress(malId: number) {
  return getMediaProgress(malId, 'anime');
}

export async function addAnimeToLists(data: Parameters<typeof addMediaToLists>[0], listIds: string[], progress: Parameters<typeof addMediaToLists>[2]) {
  return addMediaToLists({ ...data, type: data.type === 'manga' ? 'manga' : 'anime' }, listIds, progress);
}
