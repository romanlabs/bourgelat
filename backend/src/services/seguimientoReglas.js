// Reglas puras de los seguimientos que vencen (vacunas, desparasitaciones y
// controles): qué paciente toca llamar esta semana. Sin base de datos, para
// probarlas solas (seguimientoReglas.test.js).

// Lo vencido hace más de esto ya no se insiste desde la campanita.
const DIAS_ATRAS = 30
// Lo que vence dentro de esta ventana se avisa con tiempo para llamar.
const DIAS_ADELANTE = 7

const fechaISO = (valor) => {
  const texto = String(valor ?? '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null
}

const clave = (texto) => String(texto ?? '').trim().toLowerCase()

// De cada vacuna (o producto desparasitante) cuenta solo la última aplicación:
// si ya se puso la siguiente dosis, la anterior no está pendiente.
const ultimasPorNombre = (lista, { nombreDe, proximaDe }) => {
  const ultimas = new Map()
  for (const item of Array.isArray(lista) ? lista : []) {
    const nombre = nombreDe(item)
    if (!clave(nombre)) continue
    const actual = ultimas.get(clave(nombre))
    if (!actual || String(item.fecha || '') > String(actual.item.fecha || '')) {
      ultimas.set(clave(nombre), { item, nombre: String(nombre).trim(), proxima: fechaISO(proximaDe(item)) })
    }
  }
  return [...ultimas.values()]
}

/**
 * Pendientes de un paciente entre `desde` y `hasta` (YYYY-MM-DD, inclusive).
 * `proximaConsulta` es la de su última historia, si la tiene.
 */
const pendientesDePaciente = ({ antecedentes, proximaConsulta }, { desde, hasta }) => {
  const enVentana = (fecha) => fecha && fecha >= desde && fecha <= hasta
  const pendientes = [
    ...ultimasPorNombre(antecedentes?.vacunas, {
      nombreDe: (item) => item.nombre,
      proximaDe: (item) => item.proximaDosis,
    }).map(({ nombre, proxima }) => ({ tipo: 'vacuna', nombre, fecha: proxima })),
    ...ultimasPorNombre(antecedentes?.desparasitaciones, {
      nombreDe: (item) => item.producto || item.tipo,
      proximaDe: (item) => item.proximaFecha,
    }).map(({ nombre, proxima }) => ({ tipo: 'desparasitacion', nombre, fecha: proxima })),
  ]
  const control = fechaISO(proximaConsulta)
  if (control) pendientes.push({ tipo: 'control', nombre: 'Control', fecha: control })

  return pendientes
    .filter((pendiente) => enVentana(pendiente.fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/**
 * Junta los pacientes con algo pendiente, sin los que ya tienen una cita
 * agendada desde hoy (`conCita`, Set de mascotaId). Ordena por lo más antiguo.
 */
const armarSeguimientos = ({ pacientes, conCita = new Set(), desde, hasta, limite = 50 }) =>
  pacientes
    .filter((paciente) => !conCita.has(paciente.mascotaId))
    .map((paciente) => ({
      mascotaId: paciente.mascotaId,
      pendientes: pendientesDePaciente(paciente, { desde, hasta }),
    }))
    .filter((paciente) => paciente.pendientes.length > 0)
    .sort((a, b) => a.pendientes[0].fecha.localeCompare(b.pendientes[0].fecha))
    .slice(0, limite)

module.exports = {
  DIAS_ATRAS,
  DIAS_ADELANTE,
  pendientesDePaciente,
  armarSeguimientos,
}
