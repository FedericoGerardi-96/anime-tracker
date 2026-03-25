
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }, [removeToast])

  const toast = {
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    info: (message: string) => addToast(message, 'info'),
    warning: (message: string) => addToast(message, 'warning'),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-xs sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto
              glass-panel p-4 rounded-2xl shadow-2xl border flex items-center gap-3
              animate-in slide-in-from-right-10 duration-300
              ${t.type === 'error' ? 'border-red-500/30 bg-red-950/20' : 
                t.type === 'success' ? 'border-green-500/30 bg-green-950/20' : 
                'border-primary/30 bg-primary/10'}
            `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${t.type === 'error' ? 'bg-red-500/20 text-red-500' : 
                t.type === 'success' ? 'bg-green-500/20 text-green-500' : 
                'bg-primary/20 text-primary'}
            `}>
              <span className="material-symbols-outlined">
                {t.type === 'error' ? 'error' : 
                 t.type === 'success' ? 'check_circle' : 
                 'info'}
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
