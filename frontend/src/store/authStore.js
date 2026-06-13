import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      currentBusiness: null,

      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      setUser: (user) => set({ user }),
      setCurrentBusiness: (business) => set({ currentBusiness: business }),
      logout: () => set({ user: null, token: null, refreshToken: null, currentBusiness: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'streetos-auth', partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, currentBusiness: state.currentBusiness }) }
  )
)
