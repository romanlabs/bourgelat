import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Cuánto dura el resaltado de lo que se abrió desde una notificación.
export const DURACION_RESALTADO = 2500

// Franja miel del elemento resaltado. Lo que se resalta lleva también
// TRANSICION_RESALTADO para que al quitarse se desvanezca y no parpadee.
export const CLASE_RESALTADO = 'bg-warning-soft'
export const TRANSICION_RESALTADO = 'transition-colors duration-700'

/** Estado de navegación que pide resaltar algo en la pantalla de destino. */
export const pedirResaltado = (tipo, id, extra = {}) => ({ ...extra, resaltar: { tipo, id } })

/**
 * Lo que la campanita manda resaltar al llegar a una pantalla
 * (`state: pedirResaltado('cliente', id)`). Devuelve el id si es del `tipo`
 * pedido. El resaltado corre desde que ese elemento está en pantalla
 * (`presente(id)`), no desde que carga la página ni desde que hay filas: lo
 * lleva a la vista (busca `data-resaltar-id`) y se quita solo. El estado de navegación se limpia para que volver o recargar
 * no lo repita.
 */
export function useResaltado(tipo, { presente = () => true } = {}) {
  const location = useLocation()
  const navigate = useNavigate()
  const pedido = location.state?.resaltar?.tipo === tipo ? location.state.resaltar.id ?? null : null
  // Cada navegación trae su `key`: si ya se estaba en esta pantalla no hay
  // montaje nuevo, y el pedido se toma aquí al cambiar la navegación.
  const [resaltado, setResaltado] = useState(() => ({ key: location.key, id: pedido }))
  if (pedido != null && resaltado.key !== location.key) {
    setResaltado({ key: location.key, id: pedido })
  }
  const id = resaltado.id

  useEffect(() => {
    if (location.state?.resaltar?.tipo !== tipo) return
    // eslint-disable-next-line no-unused-vars
    const { resaltar, ...resto } = location.state
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: Object.keys(resto).length ? resto : null,
    })
  }, [location.pathname, location.search, location.state, navigate, tipo])

  const activo = id != null && presente(id)
  useEffect(() => {
    if (!activo) return
    document
      .querySelector(`[data-resaltar-id="${CSS.escape(String(id))}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const quitar = window.setTimeout(() => setResaltado((previo) => ({ ...previo, id: null })), DURACION_RESALTADO)
    return () => window.clearTimeout(quitar)
  }, [activo, id])

  return id
}
