// store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token:   string | null
  user:    { id: string; walletAddress: string; email?: string; emailVerified: boolean; displayName?: string } | null
  setAuth: (token: string, user: AuthState['user']) => void
  clearAuth: () => void
  updateUser: (u: Partial<AuthState['user']>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:  null,
      user:   null,
      setAuth:    (token, user) => set({ token, user }),
      clearAuth:  ()           => set({ token: null, user: null }),
      updateUser: (u)          => set(s => ({ user: s.user ? { ...s.user, ...u } : null })),
    }),
    { name: 'dewafun-auth' }
  )
)
