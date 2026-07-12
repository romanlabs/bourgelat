import { useEffect, useState } from 'react'

// Retrasa la propagacion de un valor hasta que deja de cambiar durante `delay` ms.
// Para cajas de busqueda: evita disparar una peticion al servidor por cada tecla.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
