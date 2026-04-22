import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowed.includes(user.role)) return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
