// Reglas puras de los recordatorios de cobro de suscripciones: a quién avisar,
// con qué tipo de aviso, qué precios mostrar y el enlace de WhatsApp. Sin base
// de datos ni envío, para poder probarlas con `node` directo.
const { parsePhoneNumberFromString } = require('libphonenumber-js/max')
const { PLANES, CORTESIA_END_DATE } = require('../config/planes')

const TOPE_POR_EJECUCION = 30
const TIPOS = ['vence_pronto', 'vence_manana', 'vencida']

// Los nombres de PLANES no llevan tilde; en el correo sí se muestran.
const NOMBRES_VISIBLES = { activo: 'Clínica' }

const nombrePlan = (plan) => NOMBRES_VISIBLES[plan] || PLANES[plan]?.nombre || plan

// Días de calendario entre dos fechas YYYY-MM-DD; negativo si fechaFin ya pasó.
const diasHasta = (fechaFin, hoy) => {
  const aUTC = (fecha) => {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-').map(Number)
    return Date.UTC(anio, mes - 1, dia)
  }
  return Math.round((aUTC(fechaFin) - aUTC(hoy)) / 86400000)
}

// null si no toca avisar. Ventanas: 7 a 2 días antes (vence_pronto), 1 día antes
// y el mismo día (vence_manana), y hasta 3 días después (vencida).
const clasificarRecordatorio = ({ suscripcion, hoy, tieneOtraVigente = false }) => {
  const { plan, estado, fechaInicio, precio } = suscripcion
  const fechaFin = String(suscripcion.fechaFin).slice(0, 10)

  if (plan === 'cortesia' || fechaFin === CORTESIA_END_DATE) return null
  if (plan === 'personalizado' && !(Number(precio) > 0)) return null
  if (tieneOtraVigente) return null
  // Fila de solo lectura creada al vuelo (inicio = fin): no hay nada que cobrar.
  if (estado === 'solo_lectura' && String(fechaInicio).slice(0, 10) === fechaFin) return null

  const dias = diasHasta(fechaFin, hoy)

  if (estado === 'solo_lectura') {
    return dias < 0 && dias >= -3 ? { tipo: 'vencida', dias } : null
  }
  if (estado !== 'activa' && estado !== 'prueba') return null

  if (dias > 7) return null
  if (dias >= 2) return { tipo: 'vence_pronto', dias }
  if (dias >= 0) return { tipo: 'vence_manana', dias }
  if (dias >= -3) return { tipo: 'vencida', dias }
  return null
}

// Lo que el correo muestra como precio: el de la fila si lo tiene; en prueba sin
// precio, los planes que puede contratar.
const preciosRecordatorio = ({ plan, precio }) => {
  if (Number(precio) > 0) {
    return [{ nombre: plan === 'prueba' ? 'Tu plan' : nombrePlan(plan), precioMensual: Number(precio) }]
  }
  if (plan === 'prueba') {
    return Object.entries(PLANES)
      .filter(([key, p]) => !['prueba', 'cortesia', 'personalizado'].includes(key) && p.precioMensual > 0)
      .map(([key, p]) => ({ nombre: nombrePlan(key), precioMensual: p.precioMensual }))
  }
  const precioPlan = PLANES[plan]?.precioMensual
  return precioPlan > 0 ? [{ nombre: nombrePlan(plan), precioMensual: precioPlan }] : []
}

// Celular de cualquier país como indicativo + número, solo dígitos (lo que pide
// wa.me); null si no es válido o es un fijo. Sin indicativo se asume Colombia.
const TIPOS_CON_WHATSAPP = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE'])
const normalizarCelular = (telefono) => {
  const numero = parsePhoneNumberFromString(String(telefono ?? ''), 'CO')
  if (!numero?.isValid() || !TIPOS_CON_WHATSAPP.has(numero.getType())) return null
  return numero.number.slice(1)
}

const enlaceWhatsapp = ({ telefono, nombreClinica, urlPagar }) => {
  const celular = normalizarCelular(telefono)
  if (!celular) return null
  const mensaje = `Hola, te escribimos de Bourgelat. La suscripción de ${nombreClinica} está por vencer o ya venció. Puedes renovarla aquí: ${urlPagar}`
  return `https://wa.me/${celular}?text=${encodeURIComponent(mensaje)}`
}

const cabeEnTope = ({ enviados, destinatarios, tope = TOPE_POR_EJECUCION }) =>
  enviados + destinatarios <= tope

module.exports = {
  TOPE_POR_EJECUCION,
  TIPOS,
  diasHasta,
  clasificarRecordatorio,
  preciosRecordatorio,
  normalizarCelular,
  enlaceWhatsapp,
  cabeEnTope,
}
