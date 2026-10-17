import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { origenesDestinoOauth } from '@/lib/oauthPopup'

export default function OAuthPopupCallbackPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const estado = searchParams.get('estado')
    if (!window.opener) {
      // No se abrió como popup (ej. el navegador bloqueó window.open y se usó
      // el fallback de redirect completo): navegar directo en esta misma pestaña.
      if (estado === 'nuevo') {
        window.location.replace(`/completar-registro${window.location.hash}`)
      } else {
        window.location.replace('/dashboard')
      }
      return
    }

    const mensaje =
      estado === 'nuevo'
        ? {
            tipo: 'oauth-nuevo',
            token: new URLSearchParams(window.location.hash.replace('#', '?')).get('token'),
          }
        : { tipo: 'oauth-exito' }
    for (const origen of origenesDestinoOauth()) {
      window.opener.postMessage(mensaje, origen)
    }
    window.close()
  }, [searchParams])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
