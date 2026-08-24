const { isValidDateOnly } = require('../utils/dateOnly')

const cleanText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return undefined

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined

  return normalized.slice(0, maxLength)
}

const normalizarTipoCorte = (value) => cleanText(value, 240)

const normalizarObservaciones = (value) => cleanText(value, 4000)

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
