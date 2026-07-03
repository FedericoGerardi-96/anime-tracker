'use client'

import { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import Image from 'next/image'
import { getUserMediaMetadata, upsertUserMediaMetadata } from '@/lib/actions/favorite-metadata'
import { IUserMediaMetadata } from '@/types/favorites'

interface EditFavoriteModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
  mediaData: {
    id: string       // media table UUID
    mal_id: number
    title: string
    image: string
    type: string
    description?: string
  }
}

export default function EditFavoriteModal({
  isOpen,
  onClose,
  onSaved,
  mediaData,
}: Readonly<EditFavoriteModalProps>) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customDescription, setCustomDescription] = useState('')
  const [watchLink, setWatchLink] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load existing metadata when modal opens
  useEffect(() => {
    if (isOpen && mediaData.id) {
      setLoading(true)
      setError(null)
      getUserMediaMetadata(mediaData.id).then((data: IUserMediaMetadata | null) => {
        if (data) {
          setCustomDescription(data.custom_description ?? '')
          setWatchLink(data.watch_link ?? '')
          setCustomTags(data.custom_tags ?? [])
        } else {
          setCustomDescription('')
          setWatchLink('')
          setCustomTags([])
        }
        setLoading(false)
      })
    }
  }, [isOpen, mediaData.id])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !customTags.includes(tag)) {
      setCustomTags((prev) => [...prev, tag])
    }
    setTagInput('')
  }, [tagInput, customTags])

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tagToRemove))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const result = await upsertUserMediaMetadata({
      media_id: mediaData.id,
      custom_description: customDescription.trim() || null,
      watch_link: watchLink.trim() || null,
      custom_tags: customTags,
    })

    if (result.success) {
      onSaved?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-default"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        className="glass-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with media preview */}
        <div className="relative">
          {/* Background blur image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={mediaData.image || 'https://via.placeholder.com/300x400?text=No+Image'}
              alt=""
              fill
              className="object-cover blur-2xl scale-150 opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900" />
          </div>

          <div className="relative p-6 flex items-start gap-4">
            {/* Thumbnail */}
            <div className="w-16 h-22 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-lg">
              <Image
                src={mediaData.image || 'https://via.placeholder.com/300x400?text=No+Image'}
                alt={mediaData.title}
                width={64}
                height={88}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & type */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                Edit Custom Data
              </p>
              <h2 className="text-xl font-bold text-text-primary leading-tight truncate">
                {mediaData.title}
              </h2>
              <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-semibold">
                {mediaData.type?.toUpperCase()}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Form fields */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Custom Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">description</span>
                  Personal Notes
                </label>
                <textarea
                  className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-600 text-sm resize-none custom-scrollbar"
                  placeholder="Write your own notes, description, or reminders about this series..."
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                />
              </div>

              {/* Watch Link */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">link</span>
                  Watch Link
                </label>
                <div className="relative group">
                  <input
                    className="w-full bg-slate-950/50 border border-primary/20 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-600 text-sm"
                    placeholder="https://crunchyroll.com/..."
                    type="url"
                    value={watchLink}
                    onChange={(e) => setWatchLink(e.target.value)}
                  />
                  {watchLink && (
                    <a
                      href={watchLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Custom Tags */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">label</span>
                  Custom Tags
                </label>

                {/* Tag chips */}
                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {customTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/30"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag input */}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-slate-950/50 border border-primary/20 rounded-xl py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-slate-600 text-sm"
                    placeholder="Add a tag and press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                    className="bg-primary/20 text-primary hover:bg-primary hover:text-white px-3 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined font-bold">
                  {saving ? 'sync' : 'save'}
                </span>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
