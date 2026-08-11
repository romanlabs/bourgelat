import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function OAuthPopupCallbackPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const estado = searchParams.get('estado')
    const origen = window.location.origin

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

    if (estado === 'nuevo') {
      const token = new URLSearchParams(window.location.hash.replace('#', '?')).get('token')
      window.opener.postMessage({ tipo: 'oauth-nuevo', token }, origen)
    } else {
      window.opener.postMessage({ tipo: 'oauth-exito' }, origen)
    }
    window.close()
  }, [searchParams])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
