
'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { sharedListReturnPath } from '@/lib/list-sharing'
import { signupConfirmationMessage, signupErrorMessage } from '@/lib/auth-signup'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
  returnTo?: string
  onAuthenticated?: () => void
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', returnTo, onAuthenticated }: Readonly<AuthModalProps>) {
  const formId = useId()
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  if (!isOpen) return null

  const callbackUrl = () => {
    const url = new URL('/auth/callback', globalThis.location.origin)
    const next = sharedListReturnPath(returnTo)
    if (next) url.searchParams.set('next', next)
    return url.href
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl(),
          },
        })
        if (error) {
          setError(signupErrorMessage(error.code))
          return
        }
        if (!data.session) {
          setSuccess(signupConfirmationMessage)
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      if (onAuthenticated) onAuthenticated()
      else onClose()
      router.refresh()
    } catch (err: unknown) {
      setError(mode === 'signup' ? signupErrorMessage(undefined) : err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl(),
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}>
      {/* Modal Container */}
      <div className="border border-border bg-card w-full max-w-md rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300 pointer-events-auto max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">

        {/* Decorative Top Section */}
        <div className="h-32 bg-gradient-to-br from-primary/30 to-purple-900/30 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="text-center z-10">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-2 shadow-lg">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-foreground">AniTrack</h2>
          </div>
          <button type="button"
            aria-label="Cerrar ventana de inicio de sesión"
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-all hover:rotate-90 cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 pt-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-foreground">
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear Cuenta'}
            </h3>
            <p className="text-text-muted text-sm mt-1">
              {mode === 'login' ? 'Inicia sesión para sincronizar tus listas' : 'Únete para encontrar tu anime favorito'}
            </p>
          </div>

          {/* Social Login */}
          <button type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95 mb-6 cursor-pointer shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-text-muted font-black uppercase tracking-widest">o Email</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div role="alert" className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-foreground text-xs font-bold flex items-center gap-2 motion-safe:animate-in motion-safe:slide-in-from-top-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground text-xs font-bold flex items-center gap-2 motion-safe:animate-in motion-safe:slide-in-from-top-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {success}
            </div>
          )}

          {/* Email Form */}
          <form className="space-y-4" onSubmit={handleAuth}>
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-email`} className="text-[10px] font-black text-text-muted uppercase ml-1 tracking-wider">Email</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-lg group-focus-within:text-primary transition-colors">
                  mail
                </span>
                <input
                  id={`${formId}-email`} name="email" autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor={`${formId}-password`} className="text-[10px] font-black text-text-muted uppercase tracking-wider">Contraseña</label>
                {mode === 'login' && (
                  <Link href="/forgot-password" onClick={onClose} className="inline-flex min-h-11 items-center text-xs font-bold text-primary  ">¿Olvidaste tu contraseña?</Link>
                )}
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-lg group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  id={`${formId}-password`} name="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/10 transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-black text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    {mode === 'login' ? 'login' : 'person_add'}
                  </span>
                  {mode === 'login' ? 'Iniciar sesión en AniTrack' : 'Crear cuenta'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted font-medium">
              {mode === 'login' ? "No tienes una cuenta?" : "Ya tienes una cuenta?"}
              <button type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError(null)
                  setSuccess(null)
                }}
                className="text-primary font-black   ml-2 transition-all cursor-pointer"
              >
                {mode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
