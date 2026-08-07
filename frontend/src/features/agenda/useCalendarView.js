import { useState } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const STORAGE_KEY = 'agenda-view'
const VIEWS = ['dia', 'semana', 'mes']

/**
 * Vista activa del calendario ('dia' | 'semana' | 'mes'), persistida en localStorage.
 * En móvil la vista semanal no es usable: effectiveView cae a 'dia' sin
 * sobrescribir la preferencia guardada.
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

  const effectiveView = isMobile && view === 'semana' ? 'dia' : view

  return { view, effectiveView, setView, isMobile }
}
