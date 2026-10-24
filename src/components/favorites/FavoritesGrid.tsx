'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { IFavorites, Media } from '@/types/favorites'
import EditFavoriteModal from '@/components/ui/EditFavoriteModal'
import { toggleFavorite } from '@/lib/actions/media'
import { useToast } from '@/components/ui/Toast'
import QuickStatusSelect from '@/components/library/QuickStatusSelect'
import FavoriteDetailsDrawer from '@/components/favorites/FavoriteDetailsDrawer'

interface FavoritesGridProps {
  favorites: IFavorites[]
}

export default function FavoritesGrid({ favorites }: Readonly<FavoritesGridProps>) {
  const router = useRouter()
  const { error, warning } = useToast()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [editingMedia, setEditingMedia] = useState<{
    id: string
    mal_id: number
    title: string
    image: string
    type: string
    total_units?: number
    metadata?: IFavorites['user_metadata']
    progress?: IFavorites['progress']
  } | null>(null)
  const [viewingFavorite, setViewingFavorite] = useState<IFavorites | null>(null)

  const handleEdit = (media: Media, metadata?: IFavorites['user_metadata'], progress?: IFavorites['progress']) => {
    setEditingMedia({
      id: media.id,
      mal_id: media.mal_id,
      title: media.title,
      image: media.image,
      type: media.type,
      total_units: media.total_units,
      metadata,
      progress,
    })
  }

  const handleModalClose = () => {
    setEditingMedia(null)
  }

  const handleSaved = () => {
    router.refresh()
  }

  const handleRemove = async (media: Media) => {
    if (confirm(`¿Quitar "${media.title}" de favoritos?`)) {
      setRemovingId(media.mal_id)
      const res = await toggleFavorite({
        mal_id: media.mal_id,
        title: media.title,
        image: media.image,
        type: media.type as 'anime' | 'manga',
      })
      if (res.success) {
        router.refresh()
        if (res.warning) warning(res.warning)
      } else if (res.error) {
        error(res.error)
      }
      setRemovingId(null)
    }
  }

  return (
    <>
      {/* View Switcher Controls */}
      <div className="flex justify-end mb-8">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
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
            Cuadrícula
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
            Lista
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {favorites.map((fav: IFavorites, index) => {
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
                    sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, (max-width: 1279px) 22vw, 18vw"
                    loading={index < 2 ? 'eager' : 'lazy'}
                    fetchPriority={index < 2 ? 'high' : 'auto'}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                  {/* Type & Progress badges — top left */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                        {mediaType}
                      </span>
                    </div>
                    <QuickStatusSelect compact onMedia mediaId={media.id} malId={media.mal_id} mediaType={media.type as 'anime' | 'manga'} initialStatus={progress?.status} currentEpisode={progress?.current_episode ?? 0} />
                  </div>

                  {/* Action buttons — top right */}
                  <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                    {/* Favorite heart — always visible */}
                    <button
                      type="button"
                      onClick={() => handleRemove(media)}
                      disabled={isRemoving}
                      className="w-10 h-10 rounded-full bg-primary hover:bg-red-600 flex items-center justify-center shadow-lg text-white transition-colors cursor-pointer disabled:opacity-50"
                      title="Quitar de favoritos"
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: isRemoving ? "'FILL' 0" : "'FILL' 1" }}
                      >
                        {isRemoving ? 'sync' : 'favorite'}
                      </span>
                    </button>
                    <button type="button" onClick={() => setViewingFavorite(fav)} className="w-10 h-10 rounded-full bg-slate-900/70 backdrop-blur-md flex items-center justify-center shadow-lg text-white hover:bg-primary/80 transition-all opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 cursor-pointer border border-white/10" title="Ver información" aria-label={`Ver información de ${media.title}`}>
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(media, userMeta, progress)}
                      className="w-10 h-10 rounded-full bg-slate-900/70 backdrop-blur-md flex items-center justify-center shadow-lg text-white hover:bg-primary/80 transition-all opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 cursor-pointer border border-white/10"
                      title="Editar datos personalizados"
                      aria-label={`Editar ${media.title}`}
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: "'FILL' 0" }}
                      >
                        edit
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
                      <span className="material-symbols-outlined text-xs">play_circle</span> {media.type === 'manga' ? 'Leer' : 'Ver'}
                    </a>
                  )}

                  {/* Quick View overlay */}
                  <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <Link
                      href={`/${media.type || "anime"}/${media.mal_id}`}
                      className="block text-center w-full bg-white text-slate-900 font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-200 transition-colors"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>

                <div className="px-1">
                  <h3 className="text-foreground font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                    {media.title}
                  </h3>
                  {/* Show custom description if exists, otherwise show tags */}
                  {userMeta?.custom_description ? (
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2 font-medium">
                      {userMeta.custom_description}
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
                        <span className="text-muted-foreground text-[9px] font-bold px-1 py-0.5">
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
          {favorites.map((fav: IFavorites, index) => {
            const media = Array.isArray(fav.media) ? fav.media[0] : fav.media
            if (!media) return null
            const userMeta = fav.user_metadata
            const progress = fav.progress
            const isRemoving = removingId === media.mal_id

            return (
              <div
                key={fav.id}
                className="glass-card hover:border-primary/30 transition-all duration-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-6 relative group border border-border bg-card/70 backdrop-blur-md"
              >
                {/* Poster & Title Info */}
                <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                  <div className="w-16 h-22 rounded-xl overflow-hidden shrink-0 border border-white/5 relative aspect-3/4 shadow-lg">
                    <Image
                      alt={media.title}
                      src={media.image || "https://via.placeholder.com/300x400?text=No+Image"}
                      fill
                      sizes="64px"
                      loading={index < 2 ? 'eager' : 'lazy'}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9px] bg-muted text-muted-foreground font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-border">
                        {media.type?.toUpperCase()}
                      </span>
                      <QuickStatusSelect compact mediaId={media.id} malId={media.mal_id} mediaType={media.type as 'anime' | 'manga'} initialStatus={progress?.status} currentEpisode={progress?.current_episode ?? 0} />
                    </div>
                    <Link
                      href={`/${media.type || "anime"}/${media.mal_id}`}
                      className="text-foreground font-bold text-base leading-tight hover:text-primary transition-colors block truncate"
                    >
                      {media.title}
                    </Link>
                  </div>
                </div>

                {/* Custom Description (Personal notes) */}
                <div className="flex-[2] min-w-[280px] bg-muted/60 rounded-xl p-3 border border-border md:max-w-md">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Notas personales
                  </p>
                  <p className="text-foreground/80 text-xs line-clamp-3 italic">
                    {userMeta?.custom_description || "Todavía no agregaste notas personales."}
                  </p>
                </div>

                {/* Custom Tags */}
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                    Mis etiquetas
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
                    <span className="text-[10px] text-muted-foreground italic">Ninguna</span>
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
                      {media.type === 'manga' ? 'Leer' : 'Ver'}
                    </a>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic px-2">Sin enlace</span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-l border-border pl-4">
                    <button type="button" onClick={() => setViewingFavorite(fav)} className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all cursor-pointer" title="Ver información">
                      <span className="material-symbols-outlined text-base">visibility</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(media, userMeta, progress)}
                      className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all cursor-pointer"
                      title="Editar datos personalizados"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(media)}
                      disabled={isRemoving}
                      className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-red-600 hover:border-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                      title="Quitar de favoritos"
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
          initialMetadata={editingMedia.metadata}
          initialProgress={editingMedia.progress}
        />
      )}
      {viewingFavorite && <FavoriteDetailsDrawer favorite={viewingFavorite} onClose={() => setViewingFavorite(null)} />}
    </>
  )
}
