// Formato de hora de 12 horas para la interfaz.
//
// El almacenamiento, la API y toda comparacion siguen usando 'HH:MM' en 24
// horas: es lo que guardan las columnas TIME de citas y lo unico que ordena
// correctamente como texto. La conversion a 12 horas ocurre solo en el borde
// de la UI.

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const formateador = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Recorta 'HH:MM:SS' (como vuelve Postgres) y valida el formato. */
export const normalizarHora = (valor) => {
  if (typeof valor !== 'string') return null
  const recortado = valor.trim().slice(0, 5)
  return HORA_REGEX.test(recortado) ? recortado : null
}

/** '14:30' → '2:30 p. m.' */
export const formatHora12 = (valor, fallback = '') => {
  const hora = normalizarHora(valor)
  if (!hora) return fallback

  const [h, m] = hora.split(':').map(Number)
  return formateador.format(new Date(2000, 0, 1, h, m))
}

/** '14:30' → { hora: 2, minuto: 30, periodo: 'PM' } */
export const to12h = (valor) => {
  const hora = normalizarHora(valor)
  if (!hora) return { hora: 12, minuto: 0, periodo: 'AM' }

  const [h, m] = hora.split(':').map(Number)
  const periodo = h >= 12 ? 'PM' : 'AM'
  // 00:xx es 12 a. m. y 12:xx es 12 p. m.
  const hora12 = h % 12 === 0 ? 12 : h % 12

  return { hora: hora12, minuto: m, periodo }
}

/** { hora: 2, minuto: 30, periodo: 'PM' } → '14:30' */
export const to24h = ({ hora, minuto, periodo }) => {
  const base = Number(hora) % 12
  const h = periodo === 'PM' ? base + 12 : base
  const m = Number(minuto) || 0

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Etiqueta de una franja completa: '8:00 a. m. – 12:00 p. m.' */
export const formatFranja12 = (inicio, fin) => `${formatHora12(inicio)} – ${formatHora12(fin)}`

export const HORAS_12 = Array.from({ length: 12 }, (_, index) => index + 1)
export const MINUTOS_15 = [0, 15, 30, 45]
export const PERIODOS = ['AM', 'PM']
