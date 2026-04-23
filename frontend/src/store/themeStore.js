import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set) => ({
      dark: false,
      toggleDark: () => set((state) => ({ dark: !state.dark })),
      setDark: (dark) => set({ dark }),
    }),
    { name: 'bourgelat-theme' }
  )
)
