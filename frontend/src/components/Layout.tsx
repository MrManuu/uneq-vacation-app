import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Logo from './Logo'
import api from '@/api/client'
import toast from 'react-hot-toast'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const location = useLocation()

  const isManager = user?.role === 'manager' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    }
    logout()
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-150 border-b-2 pb-0.5 ${
      isActive
        ? 'text-brand-dark border-brand-gold'
        : 'text-brand-gray border-transparent hover:text-brand-dark hover:border-brand-peach'
    }`

  const mobileNavClass = (path: string) =>
    `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      location.pathname === path
        ? 'bg-brand-dark text-white'
        : 'text-brand-gray hover:bg-gray-100 hover:text-brand-dark'
    }`

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" onClick={closeMenu}>
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/dashboard" className={navClass}>Übersicht</NavLink>
            <NavLink to="/my-requests" className={navClass}>Meine Anträge</NavLink>
            <NavLink to="/team" className={navClass}>Teamkalender</NavLink>
            {isManager && (
              <NavLink to="/approvals" className={navClass}>Genehmigungen</NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>Verwaltung</NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChangePw(true)}
              className="text-sm text-brand-gray hidden sm:block hover:text-brand-dark transition-colors"
              title="Passwort ändern"
            >
              {user?.full_name}
            </button>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3 hidden md:block">
              Abmelden
            </button>
            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menü"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide px-4 pb-2">
              {user?.full_name}
            </p>
            <Link to="/dashboard" className={mobileNavClass('/dashboard')} onClick={closeMenu}>Übersicht</Link>
            <Link to="/my-requests" className={mobileNavClass('/my-requests')} onClick={closeMenu}>Meine Anträge</Link>
            <Link to="/team" className={mobileNavClass('/team')} onClick={closeMenu}>Teamkalender</Link>
            {isManager && (
              <Link to="/approvals" className={mobileNavClass('/approvals')} onClick={closeMenu}>Genehmigungen</Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={mobileNavClass('/admin')} onClick={closeMenu}>Verwaltung</Link>
            )}
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <button
                onClick={() => { closeMenu(); setShowChangePw(true) }}
                className="w-full text-left px-4 py-3 text-sm text-brand-gray font-medium hover:bg-gray-100 rounded-lg"
              >
                Passwort ändern
              </button>
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 rounded-lg">
                Abmelden
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-brand-dark text-white/40 text-xs text-center py-4">
        © {new Date().getFullYear()} UNEQ Consulting · Urlaubsverwaltung
      </footer>

      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) {
      toast.error('Neue Passwörter stimmen nicht überein')
      return
    }
    setLoading(true)
    try {
      await api.post('/users/me/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      toast.success('Passwort erfolgreich geändert')
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Fehler beim Ändern'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Passwort ändern</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              className="input"
              required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">
              Neues Passwort
            </label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">
              Neues Passwort bestätigen
            </label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Wird gespeichert …' : 'Speichern'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      </div>
    </div>
  )
}
