import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      clinica: null,
      isAuthenticated: false,

      setAuth: ({ token, clinica }) => set({
        token,
        clinica,
        isAuthenticated: true,
      }),

      clearAuth: () => set({
        token: null,
        clinica: null,
        isAuthenticated: false,
      }),

      getToken: () => get().token,
    }),
    {
      name: 'vetnova-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        clinica: state.clinica,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)