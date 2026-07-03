'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { IFavorites, Media } from '@/types/favorites'
import EditFavoriteModal from '@/components/ui/EditFavoriteModal'
import { toggleFavorite } from '@/lib/actions/media'

interface FavoritesGridProps {
  favorites: IFavorites[]
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'watching': return 'Watching'
    case 'completed': return 'Completed'
    case 'on_hold': return 'On Hold'
    case 'dropped': return 'Dropped'
    case 'plan_to_watch': return 'Plan to Watch'
    default: return status
  }
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'watching': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
    case 'completed': return 'bg-green-500/10 text-green-400 border border-green-500/20'
    case 'on_hold': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'dropped': return 'bg-red-500/10 text-red-400 border border-red-500/20'
    case 'plan_to_watch': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
    default: return 'bg-slate-800 text-slate-400 border border-white/5'
  }
}

export default function FavoritesGrid({ favorites }: Readonly<FavoritesGridProps>) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [editingMedia, setEditingMedia] = useState<{
    id: string
    mal_id: number
    title: string
    image: string
    type: string
    description?: string
  } | null>(null)

  const handleEdit = (media: Media) => {
    setEditingMedia({
      id: media.id,
      mal_id: media.mal_id,
      title: media.title,
      image: media.image,
      type: media.type,
      description: media.description,
    })
  }

  const handleModalClose = () => {
    setEditingMedia(null)
  }

  const handleSaved = () => {
    router.refresh()
  }

  const handleRemove = async (media: Media) => {
    if (confirm(`Remove "${media.title}" from favorites?`)) {
      setRemovingId(media.mal_id)
      const res = await toggleFavorite({
        mal_id: media.mal_id,
        title: media.title,
        image: media.image,
        type: media.type as 'anime' | 'manga',
      })
      if (res.success) {
        router.refresh()
      }
      setRemovingId(null)
    }
  }

  return (
    <>
      {/* View Switcher Controls */}
      <div className="flex justify-end mb-8">
        <div className="bg-slate-900/60 backdrop-blur-md p-1 rounded-xl border border-white/10 flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-primary text-white shadow-lg'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">grid_view</span>
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-lg'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">list</span>
            List
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {favorites.map((fav: IFavorites) => {
            const media = Array.isArray(fav.media) ? fav.media[0] : fav.media
            if (!media) return null
            const mediaType = media.type ? media.type.toUpperCase() : "ANIME"
            const userMeta = fav.user_metadata
            const progress = fav.progress
            const isRemoving = removingId === media.mal_id

            return (
              <div key={fav.id} className="group relative flex flex-col gap-4">
                <div className="relative aspect-3/4 rounded-2xl overflow-hidden glass-card transition-all duration-500 hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 bg-white/5">
                  <Image
                    alt={media.title || "Media Poster"}
                    className="w-full! h-full! object-cover transition-transform duration-700 group-hover:scale-110"
                    src={
                      media.image ||
                      "https://via.placeholder.com/300x400?text=No+Image"
                    }
                    width={300}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                  {/* Type & Progress badges — top left */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                        {mediaType}
                      </span>
                    </div>
                    {progress?.status && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest backdrop-blur-md ${getStatusStyle(progress.status)}`}>
                        {getStatusLabel(progress.status)}
                      </span>
                    )}
                  </div>

                  {/* Action buttons — top right */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(media)}
                      className="w-10 h-10 rounded-full bg-slate-900/70 backdrop-blur-md flex items-center justify-center shadow-lg text-white hover:bg-primary/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/10"
                      title="Edit custom data"
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        edit
                      </span>
                    </button>
                    {/* Favorite heart */}
                    <button
                      type="button"
                      onClick={() => handleRemove(media)}
                      disabled={isRemoving}
                      className="w-10 h-10 rounded-full bg-primary hover:bg-red-600 flex items-center justify-center shadow-lg text-white transition-colors cursor-pointer disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: isRemoving ? "'FILL' 0" : "'FILL' 1" }}
                      >
                        {isRemoving ? 'sync' : 'favorite'}
                      </span>
                    </button>
                  </div>

                  {/* Watch link badge — bottom left */}
                  {userMeta?.watch_link && (
                    <a
                      href={userMeta.watch_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-16 left-4 bg-primary/85 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-primary/30 hover:bg-primary transition-colors text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-symbols-outlined text-xs">play_circle</span> Watch
                    </a>
                  )}

                  {/* Quick View overlay */}
                  <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <Link
                      href={`/${media.type || "anime"}/${media.mal_id}`}
                      className="block text-center w-full bg-white text-slate-900 font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-200 transition-colors"
                    >
                      Quick View
                    </Link>
                  </div>
                </div>

                <div className="px-1">
                  <h3 className="text-white font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                    {media.title}
                  </h3>
                  {/* Show custom description if exists, otherwise show tags */}
                  {userMeta?.custom_description ? (
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2 font-medium">
                      {userMeta.custom_description}
                    </p>
                  ) : media.tags && media.tags.length > 0 ? (
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 truncate">
                      {media.tags.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                  {/* Show custom tags if they exist */}
                  {userMeta?.custom_tags && userMeta.custom_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {userMeta.custom_tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-primary/15 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary/20"
                        >
                          {tag}
                        </span>
                      ))}
                      {userMeta.custom_tags.length > 3 && (
                        <span className="text-slate-500 text-[9px] font-bold px-1 py-0.5">
                          +{userMeta.custom_tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="flex flex-col gap-4">
          {favorites.map((fav: IFavorites) => {
            const media = Array.isArray(fav.media) ? fav.media[0] : fav.media
            if (!media) return null
            const userMeta = fav.user_metadata
            const progress = fav.progress
            const isRemoving = removingId === media.mal_id

            return (
              <div
                key={fav.id}
                className="glass-card hover:border-primary/30 transition-all duration-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-6 relative group border border-white/10 bg-white/5 backdrop-blur-md"
              >
                {/* Poster & Title Info */}
                <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                  <div className="w-16 h-22 rounded-xl overflow-hidden shrink-0 border border-white/5 relative aspect-3/4 shadow-lg">
                    <Image
                      alt={media.title}
                      src={media.image || "https://via.placeholder.com/300x400?text=No+Image"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9px] bg-slate-900 text-slate-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-white/5">
                        {media.type?.toUpperCase()}
                      </span>
                      {progress?.status && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${getStatusStyle(progress.status)}`}>
                          {getStatusLabel(progress.status)}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/${media.type || "anime"}/${media.mal_id}`}
                      className="text-white font-bold text-base leading-tight hover:text-primary transition-colors block truncate"
                    >
                      {media.title}
                    </Link>
                    {/* Jikan original tags */}
                    {media.tags && media.tags.length > 0 && (
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mt-1 truncate">
                        {media.tags.slice(0, 3).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Custom Description (Personal notes) */}
                <div className="flex-[2] min-w-[280px] bg-slate-950/20 rounded-xl p-3 border border-white/5 md:max-w-md">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Personal Notes
                  </p>
                  <p className="text-slate-300 text-xs line-clamp-3 italic">
                    {userMeta?.custom_description || "No personal notes added yet. Hover and edit to add some."}
                  </p>
                </div>

                {/* Custom Tags */}
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    My Tags
                  </p>
                  {userMeta?.custom_tags && userMeta.custom_tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {userMeta.custom_tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-primary/10 text-primary text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-primary/25"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">None</span>
                  )}
                </div>

                {/* Link & Row Actions */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  {/* Watch Link */}
                  {userMeta?.watch_link ? (
                    <a
                      href={userMeta.watch_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-primary/30 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">play_circle</span>
                      Watch
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic px-2">No link</span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(media)}
                      className="w-9 h-9 rounded-lg bg-slate-900/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary/80 transition-all cursor-pointer"
                      title="Edit custom data"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(media)}
                      disabled={isRemoving}
                      className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-red-600 hover:border-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      <span
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: isRemoving ? "'FILL' 0" : "'FILL' 1" }}
                      >
                        {isRemoving ? 'sync' : 'favorite'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingMedia && (
        <EditFavoriteModal
          isOpen={!!editingMedia}
          onClose={handleModalClose}
          onSaved={handleSaved}
          mediaData={editingMedia}
        />
      )}
    </>
  )
}
