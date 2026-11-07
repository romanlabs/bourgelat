import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

// true solo en pantallas de 1024 px o más y si la persona no pidió reducir el
// movimiento. En celular y con movimiento reducido no hay 3D ni scroll animado.
export function useMovimientoAmplio() {
  const reducido = useReducedMotion()
  const [ancho, setAncho] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(min-width: 1024px)').matches
      : false
  )

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(min-width: 1024px)')
    const alCambiar = (e) => setAncho(e.matches)
    mq.addEventListener?.('change', alCambiar)
    return () => mq.removeEventListener?.('change', alCambiar)
  }, [])

  return ancho && !reducido
}
