import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      clinica: null,
      isAuthenticated: false,

      setAuth: ({ accessToken, refreshToken, usuario, clinica }) => set({
        accessToken,
        refreshToken,
        usuario,
        clinica,
        isAuthenticated: true,
      }),

      setAccessToken: (accessToken) => set({ accessToken }),

      clearAuth: () => set({
        accessToken: null,
        refreshToken: null,
        usuario: null,
        clinica: null,
        isAuthenticated: false,
      }),

      getToken: () => get().accessToken,
      getRefreshToken: () => get().refreshToken,
    }),
    {
      name: 'bourgelat-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        usuario: state.usuario,
        clinica: state.clinica,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
