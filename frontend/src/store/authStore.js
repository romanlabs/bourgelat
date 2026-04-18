import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      usuario: null,
      clinica: null,
      suscripcion: null,
      isAuthenticated: false,

      setAuth: ({ usuario, clinica, suscripcion = null }) => set({
        usuario,
        clinica,
        suscripcion,
        isAuthenticated: true,
      }),

      setSuscripcion: (suscripcion) => set({ suscripcion }),
      setClinica: (clinica) => set({ clinica }),

      clearAuth: () => set({
        usuario: null,
        clinica: null,
        suscripcion: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'bourgelat-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        usuario: state.usuario,
        clinica: state.clinica,
        suscripcion: state.suscripcion,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
