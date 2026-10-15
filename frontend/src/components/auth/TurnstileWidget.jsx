import { useEffect, useRef } from 'react'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
import { turnstileHabilitado, turnstileSiteKey } from '@/lib/turnstile'

let promesaScript = null

const cargarScript = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin ventana'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!promesaScript) {
    promesaScript = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => resolve(window.turnstile)
      script.onerror = () => {
        promesaScript = null
        script.remove()
        reject(new Error('No se pudo cargar la verificación'))
      }
      document.head.appendChild(script)
    })
  }
  return promesaScript
}

/**
 * Casilla «no soy un robot» de Cloudflare. Entrega el token por `onToken`
 * (null cuando vence o falla). Los tokens son de un solo uso: sube `resetKey`
 * (un contador) tras cada envío para pedir uno nuevo.
 */
export default function TurnstileWidget({ onToken, resetKey = 0, className = '' }) {
  const contenedor = useRef(null)
  const widgetId = useRef(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (resetKey === 0) return
    onTokenRef.current?.(null)
    if (widgetId.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetId.current)
      } catch {
        // El widget ya no existe; no hay nada que reiniciar.
      }
    }
  }, [resetKey])

  useEffect(() => {
    if (!turnstileHabilitado) return undefined
    let cancelado = false

    cargarScript()
      .then((turnstile) => {
        if (cancelado || !contenedor.current || !turnstile) return
        widgetId.current = turnstile.render(contenedor.current, {
          sitekey: turnstileSiteKey,
          language: 'es',
          theme: 'light',
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback': () => onTokenRef.current?.(null),
        })
      })
      .catch(() => onTokenRef.current?.(null))

    return () => {
      cancelado = true
      if (widgetId.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // Ya fue retirado.
        }
      }
      widgetId.current = null
    }
  }, [])

  if (!turnstileHabilitado) return null

  return <div ref={contenedor} className={className} aria-label="Verificación de seguridad" />
}
