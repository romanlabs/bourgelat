// Reglas puras de la pestaña «Medios de pago» de Finanzas: color de cada medio,
// qué medios se muestran, la semana y el neto después de gastos.
import { chartColors } from '@/lib/theme'
import { MEDIOS_PAGO } from '@/features/finanzas/finanzasConstants'

const ETIQUETAS = Object.fromEntries(MEDIOS_PAGO.map((medio) => [medio.id, medio.label]))
export const etiquetaMedio = (id) => ETIQUETAS[id] || 'Otro'

// El color sigue al medio, no a su puesto: «Efectivo» es ámbar todos los meses.
// Los mismos colores que «Cómo pagan» del Resumen.
const COLORES = {
  efectivo: { light: chartColors.categorica[1], dark: chartColors.categorica[1] },
  transferencia: { light: chartColors.categorica[0], dark: chartColors.oscuro.petroleo },
  tarjeta: { light: chartColors.categorica[2], dark: chartColors.categorica[7] },
  otro: { light: chartColors.categorica[5], dark: chartColors.oscuro.neutro },
}

export const colorMedio = (id, { oscuro = false } = {}) => (COLORES[id] || COLORES.otro)[oscuro ? 'dark' : 'light']

// Config de ChartContainer: cada medio expone `--color-<id>` por tema.
export const CONFIG_MEDIOS = Object.fromEntries(
  MEDIOS_PAGO.map((medio) => [medio.id, { label: medio.label, theme: COLORES[medio.id] }])
)

// Solo los medios que se usaron en el periodo o en el anterior (un medio que
// dejó de usarse también es noticia), del que más trae al que menos.
export const mediosVisibles = (medios = []) =>
  medios
    .filter((medio) => medio.cobrado > 0 || medio.anterior > 0)
    .sort((a, b) => b.cobrado - a.cobrado || b.anterior - a.anterior)

// porDiaSemana viene de domingo (0) a sábado (6); la semana se lee desde el lunes.
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const semanaDesdeLunes = (porDiaSemana = []) =>
  [1, 2, 3, 4, 5, 6, 0].map((indice) => ({ id: indice, label: DIAS[indice], valor: Number(porDiaSemana[indice] || 0) }))

// Lo cobrado menos los gastos pagados por el mismo medio (los gastos usan los
// mismos cuatro). Sin gastos en la respuesta (alcance básico) no hay neto.
const NOMBRE_NETO = {
  efectivo: 'efectivo',
  transferencia: 'transferencias',
  tarjeta: 'tarjeta',
  otro: 'otros medios',
}

export const netoDelMedio = (medio) => {
  if (!medio || medio.gastos === undefined) return null
  const cobrado = Number(medio.cobrado || 0)
  const gastos = Number(medio.gastos || 0)
  return { id: medio.id, nombre: NOMBRE_NETO[medio.id] || medio.id, cobrado, gastos, neto: cobrado - gastos }
}
