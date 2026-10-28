const { parsePhoneNumberFromString } = require('libphonenumber-js/max')

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const limpio = String(valor).trim()
  return limpio || null
}

const normalizarTexto = (valor) => limpiarTexto(valor) ?? ''

const normalizarEmail = (valor) => {
  const limpio = limpiarTexto(valor)
  return limpio ? limpio.toLowerCase() : null
}

// Celular de contacto (clínica, usuarios) en E.164: '+573001234567'. Sin
// indicativo se asume Colombia, que es como se guardaban antes (10 dígitos).
// null si está vacío o no es un número válido para su país.
const normalizarCelular = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null
  const numero = parsePhoneNumberFromString(limpio, 'CO')
  return numero?.isValid() ? numero.number : null
}

const esCelularValido = (valor) => normalizarCelular(valor) !== null

// Para mostrar, igual que formatearCelular del frontend: los de Colombia en
// formato nacional (300 123 4567) y los demás con su indicativo.
const formatearCelular = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return ''
  const numero = parsePhoneNumberFromString(limpio, 'CO')
  if (!numero?.isValid()) return limpio
  return numero.country === 'CO' ? numero.formatNational() : numero.formatInternational()
}

const MENSAJE_CELULAR_INVALIDO = 'El celular no es válido para el país elegido'

const normalizarNit = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null
  return limpio.replace(/\D/g, '').slice(0, 15) || null
}

module.exports = {
  formatearCelular,
  limpiarTexto,
  normalizarTexto,
  normalizarEmail,
  normalizarCelular,
  esCelularValido,
  MENSAJE_CELULAR_INVALIDO,
  normalizarNit,
}
