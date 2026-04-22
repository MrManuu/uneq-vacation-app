import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/api/client'
import Logo from '@/components/Logo'
import { useAuthStore } from '@/store/authStore'
import type { UserWithRelations } from '@/types'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth, user } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: tokenData } = await api.post<{ access_token: string }>('/auth/login', {
        email,
        password,
      })
      const { data: me } = await api.get<UserWithRelations>('/users/me')
      setAuth(me, tokenData.access_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Anmeldung fehlgeschlagen'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4">
      {/* Decorative bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#FBB040' }} />

      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Logo variant="light" size="lg" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-heading font-bold text-brand-dark mb-1">Anmelden</h1>
          <p className="text-sm text-brand-gray mb-7">Urlaubsverwaltung · UNEQ Consulting</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1.5">
                E-Mail
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@uneq.de"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1.5">
                Passwort
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? 'Wird angemeldet …' : 'Anmelden'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          © {new Date().getFullYear()} UNEQ Consulting
        </p>
      </div>
    </div>
  )
}
