import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ACCION_PRINCIPAL, ACCION_SECUNDARIA, PantallaEstado } from '@/components/shared/PantallaEstado'
import { useAuthStore } from '@/store/authStore'

// Render responde 200 a toda ruta (rewrite al SPA): el noindex lo pone
// aplicarSeo para cualquier ruta fuera de content/seo.js, así Google no la
// indexa como duplicado de la landing (soft 404).
export default function NoEncontradaPage() {
  const conSesion = useAuthStore((estado) => estado.isAuthenticated)

  useEffect(() => {
    document.title = 'Página no encontrada | Bourgelat'
  }, [])

  return (
    <PantallaEstado
      escena="rastro"
      antetitulo="Página no encontrada"
      titulo="Esta página no existe."
      descripcion="Puede que el enlace esté mal escrito o que la página ya no exista."
      acciones={
        <>
          <Link to={conSesion ? '/dashboard' : '/'} className={ACCION_PRINCIPAL}>
            {conSesion ? 'Ir al panel' : 'Ir al inicio'}
          </Link>
          {conSesion ? null : (
            <Link to="/login" className={ACCION_SECUNDARIA}>
              Iniciar sesión
            </Link>
          )}
        </>
      }
    />
  )
}
