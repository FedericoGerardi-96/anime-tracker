
'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
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

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 11)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }, [removeToast])

  const toastValue = useMemo(() => ({
    toast: {
      success: (message: string) => addToast(message, 'success'),
      error: (message: string) => addToast(message, 'error'),
      info: (message: string) => addToast(message, 'info'),
      warning: (message: string) => addToast(message, 'warning'),
    }
  }), [addToast])

  return (
    <ToastContext.Provider value={toastValue}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-xs sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
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
              <p className="text-sm font-bold text-white line-clamp-2">{t.message}</p>
            </div>
            <button 
              onClick={() => removeToast(t.id)}
              className="text-white/40 hover:text-white transition-colors p-1"
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
