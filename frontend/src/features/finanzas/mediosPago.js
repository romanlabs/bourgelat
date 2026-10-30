// Reglas puras de la pestaña «Medios de pago» de Finanzas: color de cada medio,
// qué medios se muestran, la semana y el neto por grupo de gasto.
import { chartColors } from '@/lib/theme'
import { MEDIOS_PAGO } from '@/features/finanzas/finanzasConstants'

const ETIQUETAS = Object.fromEntries(MEDIOS_PAGO.map((medio) => [medio.id, medio.label]))
export const etiquetaMedio = (id) => ETIQUETAS[id] || 'Otro'

// El color sigue al medio, no a su puesto: «Efectivo» es ámbar todos los meses.
// Las billeteras van junto a la transferencia en tonos distintos.
const COLORES = {
  efectivo: { light: chartColors.categorica[1], dark: chartColors.categorica[1] },
  transferencia: { light: chartColors.categorica[0], dark: chartColors.oscuro.petroleo },
  nequi: { light: chartColors.categorica[3], dark: chartColors.categorica[7] },
  daviplata: { light: chartColors.categorica[6], dark: chartColors.oscuro.peligro },
  tarjeta_debito: { light: chartColors.categorica[4], dark: chartColors.oscuro.exito },
  tarjeta_credito: { light: chartColors.categorica[2], dark: chartColors.oscuro.tinta },
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

// Los gastos se registran por grupo (efectivo, transferencia, tarjeta, otro):
// el neto se calcula sobre el grupo del medio, sumando lo cobrado por todos sus
// medios. Sin gastos en la respuesta (alcance básico) no hay neto.
const NOMBRE_GRUPO = {
  efectivo: 'efectivo',
  transferencia: 'transferencias y billeteras',
  tarjeta: 'tarjetas',
  otro: 'otros medios',
}

export const netoDelGrupo = (medios = [], id) => {
  const medio = medios.find((m) => m.id === id)
  if (!medio || medio.gastosGrupo === undefined) return null
  const delGrupo = medios.filter((m) => m.grupoGasto === medio.grupoGasto)
  const cobrado = delGrupo.reduce((suma, m) => suma + Number(m.cobrado || 0), 0)
  const gastos = Number(medio.gastosGrupo || 0)
  return {
    grupo: medio.grupoGasto,
    nombre: NOMBRE_GRUPO[medio.grupoGasto] || medio.grupoGasto,
    medios: delGrupo.map((m) => m.id),
    cobrado,
    gastos,
    neto: cobrado - gastos,
  }
}
