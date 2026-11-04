import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { CORREO_LEGAL as CORREO_SOPORTE } from '@/content/legal'
import { clasificarError, debeReintentarCarga } from '@/lib/estadoError'
import { reportarErrorDePantalla } from '@/lib/reportarError'
import { useAuthStore } from '@/store/authStore'
import { ACCION_PRINCIPAL, ACCION_SECUNDARIA, PantallaEstado } from './PantallaEstado'

const recargar = () => window.location.reload()

const enLineaAhora = () => navigator.onLine !== false

// Una decisión por error: React puede pintar dos veces, y la segunda consulta
// respondería «ya se reintentó» sin que nadie haya recargado.
const decisiones = new WeakMap()
const decidirReintento = (error) => {
  if (clasificarError(error, enLineaAhora()) !== 'actualizacion') return false
  if (typeof error !== 'object') return debeReintentarCarga(window.location.pathname)
  if (!decisiones.has(error)) decisiones.set(error, debeReintentarCarga(window.location.pathname))
  return decisiones.get(error)
}

// Pantalla de cualquier error que rompe la vista. No usa <Link> porque también la
// pinta el AppErrorBoundary, que está fuera del router, y el texto técnico nunca
// llega a la clínica: en desarrollo se puede ver desplegando el detalle.
//
// Los textos cuentan lo que estamos haciendo, pero solo lo que es cierto: el aviso
// al equipo únicamente sale con sesión abierta (ver reportarError).
export function PantallaError({ error }) {
  const [enLinea, setEnLinea] = useState(enLineaAhora)
  const conSesion = useAuthStore((estado) => estado.isAuthenticated)
  const tipo = clasificarError(error, enLinea)
  const recargando = decidirReintento(error)

  useEffect(() => {
    reportarErrorDePantalla(error)
  }, [error])

  useEffect(() => {
    if (!recargando) return undefined
    const id = window.setTimeout(recargar, 900)
    return () => window.clearTimeout(id)
  }, [recargando])

  // Volvió el internet: se recarga sola, sin pedirle nada a nadie.
  useEffect(() => {
    if (enLinea) return undefined
    const alVolver = () => {
      setEnLinea(true)
      recargar()
    }
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [enLinea])

  const botonRecargar = (
    <button type="button" onClick={recargar} className={ACCION_PRINCIPAL}>
      <RefreshCw className="h-4 w-4" />
      Cargar de nuevo
    </button>
  )
  const botonInicio = (
    <a href={conSesion ? '/dashboard' : '/'} className={ACCION_SECUNDARIA}>
      {conSesion ? 'Ir al panel' : 'Ir al inicio'}
    </a>
  )
  const notaSoporte = (
    <>
      ¿Sigue igual? Escríbenos a{' '}
      <a href={`mailto:${CORREO_SOPORTE}`} className="font-medium text-tinta-800 underline underline-offset-2">
        {CORREO_SOPORTE}
      </a>
    </>
  )

  if (tipo === 'conexion') {
    return (
      <PantallaEstado
        escena="conexion"
        titulo="Se fue el internet en este equipo."
        descripcion="En cuanto vuelva la conexión, esta pantalla se abre sola. No tienes que hacer nada."
        acciones={botonRecargar}
      />
    )
  }

  if (tipo === 'actualizacion') {
    return recargando ? (
      <PantallaEstado
        escena="pulso"
        antetitulo="Bourgelat tiene mejoras"
        titulo="Estamos abriendo la versión más reciente."
        descripcion="Solo toma un momento y no tienes que hacer nada."
      />
    ) : (
      <PantallaEstado
        escena="pulso"
        antetitulo="Bourgelat tiene mejoras"
        titulo="Tu pantalla necesita ponerse al día."
        descripcion="Publicamos una versión más reciente. Carga de nuevo para seguir trabajando con ella."
        acciones={<>{botonRecargar}{botonInicio}</>}
        nota={notaSoporte}
      />
    )
  }

  return (
    <PantallaEstado
      escena="pulso"
      titulo={conSesion ? 'Estamos revisando esta pantalla.' : 'Esta pantalla no abrió como debía.'}
      descripcion={
        conSesion
          ? 'Algo no salió bien al abrirla y ya le estamos avisando al equipo de Bourgelat. Lo que ya guardaste sigue guardado.'
          : 'Prueba cargarla de nuevo o sigue desde el inicio.'
      }
      acciones={<>{botonRecargar}{botonInicio}</>}
      nota={notaSoporte}
    >
      {import.meta.env.DEV && error ? (
        <details className="mt-5 text-sm text-tinta-500">
          <summary className="cursor-pointer">Detalle (solo en desarrollo)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">{String(error?.message || error)}</pre>
        </details>
      ) : null}
    </PantallaEstado>
  )
}
