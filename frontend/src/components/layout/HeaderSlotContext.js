import { createContext, useContext } from 'react'

// setter para el contenido central de la barra superior de AdminShell (ver AdminShell.jsx).
// Las paginas que quieran aprovechar ese espacio (ej. el toolbar del calendario de Agenda)
// llaman a useAdminHeaderSlot() y le pasan un nodo React; se limpia solas en su cleanup.
export const HeaderSlotContext = createContext(null)

export function useAdminHeaderSlot() {
  return useContext(HeaderSlotContext)
}

// Funcion para abrir el dialog de busqueda global de AdminShell (el mismo que
// abre el atajo "/"). Paginas que reemplazan el centro de la barra superior
// (ver HeaderSlotContext) y aun asi quieren ofrecer un acceso rapido a esa
// busqueda usan este hook para un boton de lupa propio.
export const AdminSearchContext = createContext(null)

export function useAdminSearch() {
  return useContext(AdminSearchContext)
}
