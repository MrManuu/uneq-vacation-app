import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'
import type { UserWithRelations } from '@/types'

import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import MyRequests from '@/pages/MyRequests'
import RequestVacation from '@/pages/RequestVacation'
import Approvals from '@/pages/Approvals'
import TeamOverview from '@/pages/TeamOverview'
import Admin from '@/pages/Admin'

export default function App() {
  const { token, setUser, logout } = useAuthStore()

  // Restore user profile on refresh if token exists
  useEffect(() => {
    if (token) {
      api
        .get<UserWithRelations>('/users/me')
        .then((r) => setUser(r.data))
        .catch(() => logout())
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="/dashboard" replace />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-requests"
        element={
          <ProtectedRoute>
            <Layout>
              <MyRequests />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/request"
        element={
          <ProtectedRoute>
            <Layout>
              <RequestVacation />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/approvals"
        element={
          <ProtectedRoute requiredRole={['manager', 'admin']}>
            <Layout>
              <Approvals />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedRoute requiredRole={['manager', 'admin']}>
            <Layout>
              <TeamOverview />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <Admin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
