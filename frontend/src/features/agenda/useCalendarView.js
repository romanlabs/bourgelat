import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const STORAGE_KEY = 'agenda-view'
const SIDEBAR_STORAGE_KEY = 'agenda-sidebar-open'
const VIEWS = ['dia', 'semana', 'mes']

/**
 * Vista activa del calendario ('dia' | 'semana' | 'mes'), persistida en localStorage.
 * En móvil la vista semanal no es usable: effectiveView cae a 'dia' sin
 * sobrescribir la preferencia guardada.
 *
 * También controla el panel lateral (mini calendario): oculto por defecto,
 * se abre/cierra con un botón en la toolbar — igual que el "☰" de Google
 * Calendar — y la preferencia se recuerda entre sesiones.
 */
export function useCalendarView() {
  const [view, setViewState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return VIEWS.includes(stored) ? stored : 'semana'
    } catch {
      return 'semana'
    }
  })

  const [sidebarOpen, setSidebarOpenState] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  const isMobile = useMediaQuery('(max-width: 640px)')

  const setView = (next) => {
    if (!VIEWS.includes(next)) return
    setViewState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage no disponible — la vista solo dura la sesión
    }
  }

  const toggleSidebar = () => {
    setSidebarOpenState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // localStorage no disponible — la preferencia solo dura la sesión
      }
      return next
    })
  }

  const effectiveView = isMobile && view === 'semana' ? 'dia' : view

  return { view, effectiveView, setView, isMobile, sidebarOpen: sidebarOpen && !isMobile, toggleSidebar }
}
