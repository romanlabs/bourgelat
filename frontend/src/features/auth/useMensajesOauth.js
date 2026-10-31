import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { esOrigenOauthValido } from '@/lib/oauthPopup'

// Escucha lo que avisa el popup de Google (OAuthPopupCallbackPage) a la página
// que lo abrió: /login o /registro.
export function useMensajesOauth() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (event) => {
      if (!esOrigenOauthValido(event.origin)) return
      if (event.data?.tipo === 'oauth-exito') {
        // Hard redirect (no navigate()): la sesión OAuth solo dejó cookies
        // httpOnly, y el authStore (Zustand) sigue vacío en esta pestaña. Un
        // navigate() de react-router no remonta App ni vuelve a correr el
        // AuthBootstrap de App.jsx que llama a authApi.me(). Necesitamos una
        // carga completa para poblar el store, igual que useLogout/useLogin.
        // Va al origen del popup (app.bourgelat.co aunque el login esté en
        // bourgelat.co), que es donde vive la app.
        window.location.assign(`${event.origin}/dashboard`)
      } else if (event.data?.tipo === 'oauth-nuevo' && event.data.token) {
        // Cuenta nueva: falta el nombre de la clínica, igual que cuando el
        // navegador bloquea el popup y se llega por redirección.
        navigate(`/completar-registro#token=${encodeURIComponent(event.data.token)}`)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate])
}
