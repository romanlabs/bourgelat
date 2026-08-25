const { isValidDateOnly } = require('../utils/dateOnly')

const cleanText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return undefined

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined

  return normalized.slice(0, maxLength)
}

const normalizarTipoCorte = (value) => cleanText(value, 240)

// Igual que normalizarProximaCita: '' o null limpian explicitamente el campo
// al editar (undefined se preserva para que crear sin observaciones no
// sobreescriba nada).
const normalizarObservaciones = (value) => {
  if (value === undefined) return undefined
  if (value === null) return null

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  return normalized.slice(0, 4000)
}

// Devuelve null (no undefined) cuando viene vacia: el campo es nullable en BD
// y null la limpia explicitamente al editar.
const normalizarProximaCita = (value) => {
  if (value === undefined || value === null || value === '') return null

  if (!isValidDateOnly(value)) {
    throw new Error('La fecha de proxima cita sugerida no es valida')
  }

  return value
}

module.exports = {
  cleanText,
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
}
