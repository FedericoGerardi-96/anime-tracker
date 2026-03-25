
'use client'

import { useState, useEffect, useMemo } from 'react'
import { getLists, createList, addAnimeToLists, getAnimeProgress } from '@/lib/actions/lists'

interface List {
  id: string
  name: string
  description?: string
}

interface AnimeData {
  mal_id: number;
  title: string;
  image: string;
  type: 'anime' | 'manga';
  synopsis?: string;
  season?: string;
  tags?: string[];
  episodes?: number;
}

interface AddToListModalProps {
  isOpen: boolean
  onClose: () => void
  onListCreated?: () => void
  mode?: 'create' | 'add-anime'
  animeData?: AnimeData
  initialListIds?: string[]
}

export default function AddToListModal({ 
  isOpen, 
  onClose, 
  onListCreated,
  mode = 'add-anime',
  animeData,
  initialListIds = []
}: AddToListModalProps) {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set(initialListIds))
  const [isSaving, setIsSaving] = useState(false)
  
  // Progress & Status states
  const [status, setStatus] = useState<string>('')
  const [episode, setEpisode] = useState<number | ''>('')

  const [error, setError] = useState<string | null>(null)
  
  // New list form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'add-anime') {
        fetchLists()
        if (animeData) {
          fetchProgress(animeData.mal_id)
        }
      }
      setSelectedLists(new Set(initialListIds))
      setError(null)
    }
  }, [isOpen, mode, initialListIds, animeData])

  async function fetchLists() {
    setLoading(true)
    const { data, error } = await getLists()
    if (!error && data) {
      setLists(data)
    }
    setLoading(false)
  }

  async function fetchProgress(malId: number) {
    const data = await getAnimeProgress(malId)
    if (data) {
      setStatus(data.status || '')
      setEpisode(data.current_episode || '')
    } else {
      setStatus('')
      setEpisode('')
    }
  }

  const filteredLists = useMemo(() => {
    return lists.filter(list => 
      list.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [lists, searchQuery])

  const toggleList = (listId: string) => {
    const newSelected = new Set(selectedLists)
    if (newSelected.has(listId)) {
      newSelected.delete(listId)
    } else {
      newSelected.add(listId)
    }
    setSelectedLists(newSelected)
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setIsCreating(true)
    setError(null)
    const { data, error } = await createList(newName.trim(), newDescription.trim())
    if (!error && data) {
      if (mode === 'add-anime') {
        setLists([data, ...lists])
        const newSelected = new Set(selectedLists)
        newSelected.add(data.id)
        setSelectedLists(newSelected)
      }
      setNewName('')
      setNewDescription('')
      if (onListCreated) onListCreated()
      
      if (mode === 'create') {
        setTimeout(onClose, 500)
      }
    } else {
      setError(error || 'Failed to create list')
    }
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!animeData) {
      onClose()
      return
    }

    setIsSaving(true)
    setError(null)
    
    const progressData = (status || episode !== '') ? {
      status: status || undefined,
      current_episode: episode === '' ? 0 : Number(episode)
    } : undefined

    const result = await addAnimeToLists(
      animeData, 
      Array.from(selectedLists),
      progressData
    )
    
    if (result.success) {
      onClose()
      if (onListCreated) onListCreated() // Trigger refresh if needed
    } else {
      setError(result.error || 'Failed to save selection')
    }
    setIsSaving(false)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div 
        className="glass-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-text-primary">
              {mode === 'create' ? 'Create New List' : 'Add to List'}
            </h2>
            {mode === 'add-anime' && animeData && (
              <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-semibold truncate max-w-[280px]">
                {animeData.title}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {mode === 'add-anime' && (
          <>
            {/* Search Section */}
            <div className="px-6 py-4">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                  search
                </span>
                <input 
                  className="w-full bg-slate-900/50 border border-primary/20 rounded-lg py-2.5 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-text-muted/50"
                  placeholder="Search existing lists"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Collection List */}
            <div className="px-6 py-2 overflow-y-auto custom-scrollbar flex-1 space-y-1 min-h-[200px]">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredLists.length > 0 ? (
                filteredLists.map((list) => {
                  const isSelected = selectedLists.has(list.id)
                  return (
                    <label 
                      key={list.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                        isSelected 
                          ? "bg-primary/20 border border-primary/30" 
                          : "hover:bg-primary/10"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-sm ${isSelected ? "text-text-primary font-medium" : "text-text-muted group-hover:text-text-primary"}`}>
                          {list.name}
                        </span>
                        {list.description && (
                          <span className="text-[10px] text-text-muted line-clamp-1">{list.description}</span>
                        )}
                      </div>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleList(list.id)}
                        className={`w-5 h-5 rounded border-primary/30 bg-transparent text-primary focus:ring-primary/40 focus:ring-offset-background-dark ${
                          isSelected ? "border-primary bg-primary" : ""
                        }`}
                      />
                    </label>
                  )
                })
              ) : (
                <div className="text-center py-10">
                  <p className="text-text-muted text-sm">No lists found</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Create New List Section */}
        <div className={`p-6 bg-slate-900/10 ${mode === 'add-anime' ? 'border-t border-white/5' : ''}`}>
          {mode === 'add-anime' && (
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Create New List</p>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreateList} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-slate-900/50 border border-primary/20 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600 text-sm"
                placeholder="Enter list name..."
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              {mode === 'create' && (
                <button 
                  type="submit"
                  disabled={!newName.trim() || isCreating}
                  className="bg-primary/20 text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">{isCreating ? 'sync' : 'add'}</span>
                </button>
              )}
            </div>
            {mode === 'create' && (
              <input 
                className="w-full bg-slate-900/50 border border-primary/20 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600 text-sm"
                placeholder="Enter list description..."
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            )}
            {mode === 'add-anime' && (
              <button 
                type="submit"
                disabled={!newName.trim() || isCreating}
                className="w-full bg-primary/20 text-primary hover:bg-primary hover:text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                <span className="material-symbols-outlined text-lg">
                  {isCreating ? 'sync' : 'add'}
                </span>
                {isCreating ? 'Creating...' : 'Create List'}
              </button>
            )}
          </form>
        </div>

        {mode === 'add-anime' && (
          <>
            {/* Progress and Status Section */}
            <div className="px-6 py-4 border-t border-white/5 bg-slate-900/20 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Progress</label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-slate-950/50 border border-primary/20 rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-600 transition-all text-sm" 
                    min="0" 
                    placeholder="Ep #" 
                    type="number" 
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span className="absolute right-3 text-[10px] text-text-muted font-bold pointer-events-none">
                    {animeData?.type === 'manga' ? 'CH' : 'EP'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-950/50 border border-primary/20 rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer text-sm"
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus === 'completed' && animeData?.episodes) {
                        setEpisode(animeData.episodes);
                      }
                    }}
                  >
                    <option value="">Select status...</option>
                    <option value="watching">{animeData?.type === 'manga' ? 'Reading' : 'Watching'}</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On-Hold</option>
                    <option value="dropped">Dropped</option>
                    <option value="plan_to_watch">{animeData?.type === 'manga' ? 'Plan to Read' : 'Plan to Watch'}</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none text-lg">expand_more</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="px-6 pb-8 pt-2">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined font-bold">
                  {isSaving ? 'sync' : 'save'}
                </span>
                {isSaving ? 'Saving...' : 'Save Selection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
