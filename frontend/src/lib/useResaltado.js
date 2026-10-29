import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Cuánto dura el resaltado de lo que se abrió desde una notificación.
export const DURACION_RESALTADO = 2500

// Clase del elemento resaltado: el caramelo de la marca, un poco más fuerte
// que el de las tablas (DataTable con highlightKey) porque cubre un bloque.
export const CLASE_RESALTADO = 'bg-brand/25'

/** Estado de navegación que pide resaltar algo en la pantalla de destino. */
export const pedirResaltado = (tipo, id, extra = {}) => ({ ...extra, resaltar: { tipo, id } })

/**
 * Lo que la campanita manda resaltar al llegar a una pantalla
 * (`state: pedirResaltado('cliente', id)`). Devuelve el id si es del `tipo`
 * pedido. El resaltado corre desde que el elemento aparece (`presente`), no
 * desde que carga la página: lo lleva a la vista (busca `data-resaltar-id`) y
 * se quita solo. El estado de navegación se limpia para que volver o recargar
 * no lo repita.
 */
export function useResaltado(tipo, { presente = true } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const [id, setId] = useState(() =>
    location.state?.resaltar?.tipo === tipo ? location.state.resaltar.id ?? null : null
  )

  useEffect(() => {
    if (location.state?.resaltar?.tipo !== tipo) return
    // eslint-disable-next-line no-unused-vars
    const { resaltar, ...resto } = location.state
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: Object.keys(resto).length ? resto : null,
    })
  }, [location.pathname, location.search, location.state, navigate, tipo])

  const activo = id != null && presente
  useEffect(() => {
    if (!activo) return
    document
      .querySelector(`[data-resaltar-id="${CSS.escape(String(id))}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const quitar = window.setTimeout(() => setId(null), DURACION_RESALTADO)
    return () => window.clearTimeout(quitar)
  }, [activo, id])

  return id
}
