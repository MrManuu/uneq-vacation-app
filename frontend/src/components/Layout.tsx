import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Logo from './Logo'
import api from '@/api/client'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/dashboard" className={navClass}>
              Übersicht
            </NavLink>
            <NavLink to="/my-requests" className={navClass}>
              Meine Anträge
            </NavLink>
            <NavLink to="/team" className={navClass}>
              Team
            </NavLink>
            {isManager && (
              <NavLink to="/approvals" className={navClass}>
                Genehmigungen
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Verwaltung
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-gray hidden sm:block">
              {user?.full_name}
            </span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="bg-brand-dark text-white/40 text-xs text-center py-4">
        © {new Date().getFullYear()} UNEQ Consulting · Urlaubsverwaltung
      </footer>
    </div>
  )
}
