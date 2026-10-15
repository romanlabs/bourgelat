import { useCallback, useEffect, useRef, useState } from 'react'
import { turnstileHabilitado, turnstileSiteKey } from '@/lib/turnstile'

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

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
 * (un contador) tras cada envío para pedir uno nuevo. Si el script o el widget
 * fallan, muestra un aviso con «Reintentar» (el envío sigue bloqueado sin token).
 */
export default function TurnstileWidget({ onToken, resetKey = 0, className = '' }) {
  const contenedor = useRef(null)
  const widgetId = useRef(null)
  const onTokenRef = useRef(onToken)
  const [fallo, setFallo] = useState(false)
  const [intento, setIntento] = useState(0)

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
          theme: 'auto',
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback': () => {
            onTokenRef.current?.(null)
            if (!cancelado) setFallo(true)
          },
        })
      })
      .catch(() => {
        onTokenRef.current?.(null)
        if (!cancelado) setFallo(true)
      })

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
  }, [intento])

  const reintentar = useCallback(() => {
    setFallo(false)
    setIntento((n) => n + 1)
  }, [])

  if (!turnstileHabilitado) return null

  return (
    <div className={className}>
      {fallo ? (
        <div role="alert" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          <p>
            No pudimos cargar la verificación de seguridad. Revisa tu conexión o desactiva el
            bloqueador de anuncios para este sitio.
          </p>
          <button
            type="button"
            onClick={reintentar}
            className="mt-2 font-medium underline underline-offset-2 hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div ref={contenedor} aria-label="Verificación de seguridad" />
      )}
    </div>
  )
}
