import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { VIEW_OPTIONS, VIEW_PREFS } from './calendarConstants'

const STORAGE_KEY = 'agenda-view'
const SIDEBAR_STORAGE_KEY = 'agenda-sidebar-open'
const PREFS_STORAGE_KEY = 'agenda-view-prefs'
const VIEWS = VIEW_OPTIONS.map((opt) => opt.value)

const DEFAULT_PREFS = VIEW_PREFS.reduce((acc, pref) => ({ ...acc, [pref.key]: true }), {})

/**
 * Vista activa del calendario, persistida en localStorage.
 * En móvil las vistas multi-columna no son usables: effectiveView cae a 'dia'
 * sin sobrescribir la preferencia guardada.
 *
 * También controla el panel lateral (mini calendario) y las preferencias de
 * visualización (fines de semana, canceladas, completadas) — igual que el
 * selector de vista de Google Calendar.
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

  const [prefs, setPrefsState] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) || '{}')
      return { ...DEFAULT_PREFS, ...stored }
    } catch {
      return DEFAULT_PREFS
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

  const togglePref = (key) => {
    setPrefsState((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage no disponible — la preferencia solo dura la sesión
      }
      return next
    })
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

  const effectiveView = isMobile && (view === 'semana' || view === '4dias') ? 'dia' : view

  return {
    view,
    effectiveView,
    setView,
    isMobile,
    sidebarOpen: sidebarOpen && !isMobile,
    toggleSidebar,
    prefs,
    togglePref,
  }
}
