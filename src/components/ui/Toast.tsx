
'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type ToastAction = { label: string; onClick: () => void }

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextType {
  toast: {
    success: (message: string) => void
    error: (message: string, action?: ToastAction) => void
    info: (message: string) => void
    warning: (message: string, action?: ToastAction) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'error':
      return 'border-red-500/30 bg-red-950/20'
    case 'success':
      return 'border-green-500/30 bg-green-950/20'
    default:
      return 'border-primary/30 bg-primary/10'
  }
}

const getIconStyles = (type: ToastType) => {
  switch (type) {
    case 'error':
      return 'bg-red-500/20 text-red-500'
    case 'success':
      return 'bg-green-500/20 text-green-500'
    default:
      return 'bg-primary/20 text-primary'
  }
}

const getIconName = (type: ToastType) => {
  switch (type) {
    case 'error':
      return 'error'
    case 'success':
      return 'check_circle'
    default:
      return 'info'
  }
}

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType, action?: ToastAction) => {
    const id = Math.random().toString(36).substring(2, 11)
    setToasts((prev) => [...prev.slice(-2), { id, message, type, action }])
    setTimeout(() => removeToast(id), 5000)
  }, [removeToast])

  const toastValue = useMemo(() => ({
    toast: {
      success: (message: string) => addToast(message, 'success'),
      error: (message: string, action?: ToastAction) => addToast(message, 'error', action),
      info: (message: string) => addToast(message, 'info'),
      warning: (message: string, action?: ToastAction) => addToast(message, 'warning', action),
    }
  }), [addToast])

  return (
    <ToastContext.Provider value={toastValue}>
      {children}
      <div className="fixed bottom-6 right-4 z-[200] flex flex-col gap-3 pointer-events-none w-[calc(100%-2rem)] max-w-sm sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`
              pointer-events-auto
              glass-panel p-4 rounded-2xl shadow-2xl border flex items-center gap-3
              animate-in slide-in-from-right-10 duration-300
              ${getToastStyles(t.type)}
            `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${getIconStyles(t.type)}
            `}>
              <span className="material-symbols-outlined">
                {getIconName(t.type)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground break-words">{t.message}</p>
              {t.action && <button type="button" className="mt-2 min-h-11 text-sm text-primary underline underline-offset-4" onClick={() => { removeToast(t.id); t.action?.onClick(); }}>{t.action.label}</button>}
            </div>
            <button type="button"
              aria-label="Cerrar notificación"
              onClick={() => removeToast(t.id)}
              className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.toast
}
