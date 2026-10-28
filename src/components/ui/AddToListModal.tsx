
'use client'

import Modal from '@/components/ui/Modal'
import { Suspense, use, useState, useMemo } from 'react'
import { createList, addAnimeToLists } from '@/lib/actions/lists'
import { requestListDialog } from '@/lib/list-dialog-request'
import { Skeleton } from '@/components/fallbacks/PageSkeleton'
import { useToast } from '@/components/ui/Toast'
import type { AddToListModalProps, ListDialogFormProps, ListDialogData, ListDialogResult, ResolvedListDialogProps } from '@/interfaces/list-dialog'

const EMPTY_DATA: ListDialogData = { lists: [], listIds: [], progress: null }

export default function AddToListModal(props: Readonly<AddToListModalProps>) {
  if (!props.isOpen) return null
  return <Modal onClose={props.onClose} label={props.mode === 'create' ? 'Crear lista' : 'Agregar a lista'}>
    {props.mode === 'create' ? <ListDialogForm {...props} initialData={EMPTY_DATA} /> : <ListDialogSession key={`${props.animeData?.type}-${props.animeData?.mal_id}`} {...props} />}
  </Modal>
}

function ListDialogSession(props: Readonly<AddToListModalProps>) {
  const [retryPromise, setRetryPromise] = useState<Promise<ListDialogResult> | null>(null)
  const promise = retryPromise ?? props.dataPromise
  const retry = () => {
    if (props.animeData) setRetryPromise(requestListDialog(props.animeData.mal_id, props.animeData.type))
  }
  const placeholder = (message?: string) => <div className="w-full max-w-md">
    <div className="border border-border bg-card w-full max-w-md space-y-5 rounded-xl p-6" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Agregar a lista</h2><button type="button" onClick={props.onClose} aria-label="Cerrar">✕</button></div>
      {message ? <><p role="alert">{message}</p><button type="button" onClick={retry} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Reintentar</button></> : <div role="status" aria-label="Cargando listas y progreso…" className="space-y-4"><span className="sr-only">Cargando listas y progreso…</span><Skeleton className="h-12" /><Skeleton className="h-28" /><Skeleton className="h-12" /></div>}
    </div>
  </div>
  if (!promise) return placeholder('No pudimos iniciar la carga.')
  return <Suspense fallback={placeholder()}><ResolvedListDialog {...props} dataPromise={promise} renderError={placeholder} /></Suspense>
}

function ResolvedListDialog({ dataPromise, renderError, ...props }: Readonly<ResolvedListDialogProps>) {
  const result = use(dataPromise)
  if (!result.data) return renderError(result.error)
  return <ListDialogForm {...props} initialData={result.data} />
}

function ListDialogForm({
  isOpen, 
  onClose, 
  onListCreated,
  mode = 'add-anime',
  animeData,
  initialData
}: Readonly<ListDialogFormProps>) {
  const { warning } = useToast()
  const [lists, setLists] = useState(initialData.lists)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set(initialData.listIds))
  const [isSaving, setIsSaving] = useState(false)
  
  // Progress & Status states
  const [status, setStatus] = useState(initialData.progress?.status ?? '')
  const [episode, setEpisode] = useState<number | ''>(initialData.progress?.current_episode ?? '')

  const [error, setError] = useState<string | null>(null)
  
  // New list form
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

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
    try {
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
    } catch {
      setError("No se pudo crear la lista. Revisá tu conexión e intentá nuevamente.")
    } finally {
      setIsCreating(false)
    }
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

    try {
      const result = await addAnimeToLists(
        animeData,
        Array.from(selectedLists),
        progressData
      )

      if (result.success) {
        if (result.warning) warning(result.warning)
        onClose()
        if (onListCreated) onListCreated() // Trigger refresh if needed
      } else {
        setError(result.error || 'Failed to save selection')
      }
    } catch {
      setError("No se pudieron guardar los cambios. Revisá tu conexión e intentá nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderListContent = () => {
    if (filteredLists.length > 0) {
      return filteredLists.map((list) => {
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
    }

    return (
      <div className="text-center py-10">
        <p className="text-text-muted text-sm">No lists found</p>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div 
      className="w-full max-w-md"
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
          <button type="button"
            autoFocus
            aria-label="Cerrar ventana de listas"
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
                  aria-label="Buscar listas existentes"
                  className="w-full bg-muted border border-primary/20 rounded-lg py-2.5 pl-10 pr-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-text-muted"
                  placeholder="Search existing lists"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Collection List */}
            <div className="px-6 py-2 overflow-y-auto custom-scrollbar flex-1 space-y-1 min-h-[200px]">
              {renderListContent()}
            </div>
          </>
        )}

        {/* Create New List Section */}
        <div className={`p-6 bg-muted ${mode === 'add-anime' ? 'border-t border-white/5' : ''}`}>
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
                aria-label="Nombre de la lista"
                className="flex-1 bg-muted border border-primary/20 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-sm"
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
                  className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">{isCreating ? 'sync' : 'add'}</span>
                </button>
              )}
            </div>
            {mode === 'create' && (
              <input 
                aria-label="Descripción de la lista"
                className="w-full bg-muted border border-primary/20 rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-sm"
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
                className="w-full bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
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
            <div className="px-6 py-4 border-t border-white/5 bg-muted grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="episode" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Progress</label>
                <div className="relative flex items-center">
                  <input 
                    id="episode"
                    className="w-full bg-muted border border-primary/20 rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground transition-all text-sm"
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
                <label htmlFor="status" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</label>
                <div className="relative">
                  <select 
                    id="status"
                    className="w-full bg-muted border border-primary/20 rounded-lg py-2 px-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer text-sm"
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus === 'completed' && animeData?.episodes) {
                        setEpisode(animeData.episodes);
                      }
                    }}
                  >
                    <option value="">Seleccionar estado…</option>
                    <option value="watching">{animeData?.type === 'manga' ? 'Leyendo' : 'Viendo'}</option>
                    <option value="completed">Completado</option>
                    <option value="on_hold">En pausa</option>
                    <option value="dropped">Abandonado</option>
                    <option value="plan_to_watch">Pendiente</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none text-lg">expand_more</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="px-6 pb-8 pt-2">
              <button type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
