import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserWithRelations } from '@/types'

interface AuthState {
  user: UserWithRelations | null
  token: string | null
  setAuth: (user: UserWithRelations, token: string) => void
  setUser: (user: UserWithRelations) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null, token: null })
        window.location.href = '/login'
      },
    }),
    {
      name: 'uneq-auth',
      partialize: (state: AuthState) => ({ token: state.token }),
    },
  ),
)
