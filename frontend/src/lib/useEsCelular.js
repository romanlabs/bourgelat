import { useSyncExternalStore } from 'react'

// true por debajo de `lg` (1024px): el mismo corte con el que la app pasa a
// la vista de celular. Se actualiza al girar el teléfono o cambiar el tamaño.
const CONSULTA = '(max-width: 1023.98px)'

const suscribir = (aviso) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', aviso)
  return () => mq.removeEventListener('change', aviso)
}

const leer = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(CONSULTA).matches : false)

export function useEsCelular() {
  return useSyncExternalStore(suscribir, leer, () => false)
}
