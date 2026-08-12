// Estado de la suscripción tal como lo entrega el backend. El plan dice qué se
// compró; el estado dice si la clínica puede escribir.

export const FUNCIONALIDAD_DIAN = 'facturacion_electronica'

export const esSoloLectura = (suscripcion) => suscripcion?.estado === 'solo_lectura'

export const estaEnPrueba = (suscripcion) => suscripcion?.estado === 'prueba'

// Devuelve los días completos que faltan para el corte, o null si la clínica no
// está en prueba. `fechaFin` llega como DATEONLY ('YYYY-MM-DD'), así que se
// parsea a mano: `new Date('2026-08-30')` se interpreta como UTC medianoche y
// desplaza el día en Colombia (UTC-5).
export const diasRestantesPrueba = (suscripcion, hoy = new Date()) => {
  if (!estaEnPrueba(suscripcion) || !suscripcion?.fechaFin) {
    return null
  }

  const [year, month, day] = suscripcion.fechaFin.split('-').map(Number)
  const fin = new Date(year, month - 1, day)
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const MS_POR_DIA = 24 * 60 * 60 * 1000

  return Math.max(0, Math.round((fin - inicioDeHoy) / MS_POR_DIA))
}

export const tieneFuncionalidad = (suscripcion, clave) =>
  Array.isArray(suscripcion?.funcionalidades) && suscripcion.funcionalidades.includes(clave)
