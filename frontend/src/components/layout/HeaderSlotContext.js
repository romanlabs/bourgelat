import { createContext, useContext } from 'react'

// setter para el contenido central de la barra superior de AdminShell (ver AdminShell.jsx).
// Las paginas que quieran aprovechar ese espacio (ej. el toolbar del calendario de Agenda)
// llaman a useAdminHeaderSlot() y le pasan un nodo React; se limpia solas en su cleanup.
export const HeaderSlotContext = createContext(null)

export function useAdminHeaderSlot() {
  return useContext(HeaderSlotContext)
}
