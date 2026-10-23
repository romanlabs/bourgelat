// Reglas puras de la pestaña «Análisis del periodo» de Finanzas: rangos de los
// atajos, variación contra el periodo anterior y etiquetas de la serie.
import { fechaLocal } from '@/lib/fecha'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Cuántos años ofrece el selector, contando el actual.
const ANIOS_EN_SELECTOR = 6

const ultimoDia = (anio, mesIndice) => fechaLocal(new Date(anio, mesIndice + 1, 0))

export const PRESETS_ANALISIS = [
  { id: 'anio', label: 'Año' },
  { id: '12m', label: 'Últimos 12 meses' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'personalizado', label: 'Personalizado' },
]

export const rangoDelAnio = (anio) => ({
  fechaInicio: `${anio}-01-01`,
  fechaFin: `${anio}-12-31`,
})

// Meses completos, incluido el actual: así el backend lo compara mes a mes con
// los doce anteriores.
export const rangoUltimos12Meses = (hoy = new Date()) => ({
  fechaInicio: fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)),
  fechaFin: ultimoDia(hoy.getFullYear(), hoy.getMonth()),
})

export const rangoTrimestreActual = (hoy = new Date()) => {
  const primerMes = Math.floor(hoy.getMonth() / 3) * 3
  return {
    fechaInicio: fechaLocal(new Date(hoy.getFullYear(), primerMes, 1)),
    fechaFin: ultimoDia(hoy.getFullYear(), primerMes + 2),
  }
}

export const aniosDisponibles = (hoy = new Date()) =>
  Array.from({ length: ANIOS_EN_SELECTOR }, (_, indice) => hoy.getFullYear() - indice)

// Variación porcentual frente al periodo anterior, o null si no hay contra qué
// comparar (un periodo anterior en cero haría un «+∞ %»).
export const variacion = (actual, anterior) => {
  const base = Number(anterior || 0)
  if (!base) return null
  return Number((((Number(actual || 0) - base) / Math.abs(base)) * 100).toFixed(1))
}

// '2026-01' → 'ene 2026' · '2026-01-05' → '5 ene'
export const etiquetaPeriodo = (periodo) => {
  const [anio, mes, dia] = String(periodo || '').split('-')
  const nombreMes = MESES_CORTOS[Number(mes) - 1]
  if (!nombreMes) return periodo || ''
  return dia ? `${Number(dia)} ${nombreMes}` : `${nombreMes} ${anio}`
}

// Cómo se nombra el periodo de comparación en los KPIs. Lo decide el atajo, no
// las fechas: un rango libre de enero a marzo también empieza un 1 de enero.
export const etiquetaAnterior = (preset, anterior) => {
  if (preset === 'anio' && anterior?.fechaInicio) return anterior.fechaInicio.slice(0, 4)
  if (preset === '12m') return 'los 12 meses previos'
  if (preset === 'trimestre') return 'el trimestre anterior'
  return 'el periodo anterior'
}

// Texto y tono del badge de un KPI. `mayorEsMejor` en false invierte el color:
// que los gastos suban es una mala noticia.
export const badgeVariacion = (actual, anterior, nombreAnterior, { mayorEsMejor = true } = {}) => {
  const cambio = variacion(actual, anterior)
  if (cambio === null) return { badge: `Sin datos de ${nombreAnterior}`, badgeTone: 'bg-muted text-muted-foreground' }
  if (cambio === 0) return { badge: `Igual que ${nombreAnterior}`, badgeTone: 'bg-muted text-muted-foreground' }

  const subio = cambio > 0
  const bueno = subio === mayorEsMejor
  const signo = subio ? '+' : '−'
  return {
    badge: `${signo}${Math.abs(cambio).toLocaleString('es-CO')} % vs ${nombreAnterior}`,
    badgeTone: bueno ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
  }
}
