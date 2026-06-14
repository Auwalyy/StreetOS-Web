import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    {
      name: 'streetos-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        currentBusiness: state.currentBusiness,
      }),
    }
  )
);
