import { useRef } from 'react'

// Vibración corta al confirmar un gesto (Android; en iOS no hace nada).
export function vibrar(ms = 10) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms)
  } catch {
    // Algunos navegadores lo bloquean sin interacción previa: no es importante.
  }
}

// Decide qué gesto fue un desplazamiento del dedo. Solo cuenta como horizontal
// si recorrió más del umbral y claramente más en x que en y (si no, era scroll).
export function direccionGesto(dx, dy, umbral = 60) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax >= umbral && ax > ay * 1.5) return dx < 0 ? 'izquierda' : 'derecha'
  if (ay >= umbral && ay > ax * 1.5) return dy < 0 ? 'arriba' : 'abajo'
  return null
}

/**
 * Deslizar con el dedo a izquierda o derecha sobre un bloque (cambiar de día,
 * de semana o de pestaña). Devuelve props para el contenedor:
 *   <div {...useDeslizarHorizontal({ onIzquierda: siguiente, onDerecha: anterior })}>
 * Solo escucha toques (no mouse), así en escritorio no interfiere con nada.
 */
export function useDeslizarHorizontal({ onIzquierda, onDerecha, umbral = 60, activo = true } = {}) {
  const inicio = useRef(null)

  if (!activo) return {}

  return {
    onTouchStart: (event) => {
      const toque = event.touches[0]
      inicio.current = toque ? { x: toque.clientX, y: toque.clientY } : null
    },
    onTouchEnd: (event) => {
      const origen = inicio.current
      inicio.current = null
      const toque = event.changedTouches[0]
      if (!origen || !toque) return
      const direccion = direccionGesto(toque.clientX - origen.x, toque.clientY - origen.y, umbral)
      if (direccion === 'izquierda' && onIzquierda) {
        vibrar()
        onIzquierda()
      } else if (direccion === 'derecha' && onDerecha) {
        vibrar()
        onDerecha()
      }
    },
  }
}

/**
 * Mantener presionado (~0,45 s) para abrir opciones, como en las apps.
 * Se cancela si el dedo se mueve (era scroll). Devuelve props para el elemento
 * y `consumido()`, que dice si el último toque fue una presión larga (para no
 * disparar además el clic normal).
 */
export function useMantenerPresionado(onMantener, { ms = 450 } = {}) {
  const temporizador = useRef(null)
  const origen = useRef(null)
  const disparado = useRef(false)

  const cancelar = () => {
    clearTimeout(temporizador.current)
    temporizador.current = null
  }

  return {
    props: {
      onTouchStart: (event) => {
        const toque = event.touches[0]
        origen.current = toque ? { x: toque.clientX, y: toque.clientY } : null
        disparado.current = false
        cancelar()
        temporizador.current = setTimeout(() => {
          disparado.current = true
          vibrar(15)
          onMantener?.()
        }, ms)
      },
      onTouchMove: (event) => {
        const toque = event.touches[0]
        if (!origen.current || !toque) return
        if (Math.abs(toque.clientX - origen.current.x) > 10 || Math.abs(toque.clientY - origen.current.y) > 10) cancelar()
      },
      onTouchEnd: cancelar,
      onTouchCancel: cancelar,
      onContextMenu: (event) => {
        // Evita el menú del navegador al mantener presionado.
        if (disparado.current) event.preventDefault()
      },
    },
    consumido: () => {
      const fue = disparado.current
      disparado.current = false
      return fue
    },
  }
}
