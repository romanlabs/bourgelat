import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminShell from '@/components/layout/AdminShell'
import { ACCION_PRINCIPAL, PantallaEstado } from '@/components/shared/PantallaEstado'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

const TITULO = 'Esta página no existe'
const DESCRIPCION = 'Puede que el enlace esté mal escrito o que la página ya no exista.'

// Render responde 200 a toda ruta (rewrite al SPA): el noindex lo pone
// aplicarSeo para cualquier ruta fuera de content/seo.js, así Google no la
// indexa como duplicado de la landing (soft 404).
export default function NoEncontradaPage() {
  const conSesion = useAuthStore((estado) => estado.isAuthenticated)

  useEffect(() => {
    document.title = 'Página no encontrada | Bourgelat'
  }, [])

  // Con sesión se queda en la app: el menú ya ofrece el camino de vuelta.
  if (conSesion) {
    return (
      <AdminShell sinSeccion title={TITULO} description={DESCRIPCION}>
        <Button asChild>
          <Link to="/dashboard">Ir al panel</Link>
        </Button>
      </AdminShell>
    )
  }

  return (
    <PantallaEstado
      titulo={`${TITULO}.`}
      descripcion={DESCRIPCION}
      acciones={
        <Link to="/" className={ACCION_PRINCIPAL}>
          Ir al inicio
        </Link>
      }
    />
  )
}
