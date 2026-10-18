import { useCallback, useSyncExternalStore } from 'react'

/** Suscripción reactiva a un media query CSS, ej: useMediaQuery('(max-width: 640px)') */
export function useMediaQuery(query) {
  const suscribir = useCallback(
    (avisar) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', avisar)
      return () => mql.removeEventListener('change', avisar)
    },
    [query]
  )

  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(query).matches,
    () => false
  )
}
