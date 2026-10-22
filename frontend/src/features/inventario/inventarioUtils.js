import { invalidarDominios } from '@/lib/queryKeys'

// Mantener en sync con backend/src/utils/vencimiento.js.
export const CATEGORIAS_CON_VENCIMIENTO = [
  'medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento',
]

export const requiereVencimiento = (categoria) => CATEGORIAS_CON_VENCIMIENTO.includes(categoria)

// Mantener en sync con DIAS_ALERTA_VENCIMIENTO y clasificarVencimiento de
// backend/src/utils/vencimiento.js: el backend rechaza la venta de un vencido.
export const DIAS_ALERTA_VENCIMIENTO = 30

// Fecha de hoy YYYY-MM-DD en hora local del navegador.
export const hoyLocal = (ahora = new Date()) => {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

// Dias de `hoy` a `fecha` (ambas YYYY-MM-DD); negativo si ya paso.
export const diasParaVencer = (fecha, hoy = hoyLocal()) => {
  const aUTC = (iso) => {
    const [anio, mes, dia] = String(iso).slice(0, 10).split('-').map(Number)
    return Date.UTC(anio, mes - 1, dia)
  }
  return Math.round((aUTC(fecha) - aUTC(hoy)) / 86400000)
}

// 'vencido' (fecha anterior a hoy), 'proximo' (de hoy a 30 dias) o null. Un
// producto sin existencias no cuenta: no hay nada que vigilar ni vender.
export const estadoVencimiento = ({ fechaVencimiento, stock } = {}, hoy = hoyLocal()) => {
  if (!fechaVencimiento || Number(stock) <= 0) return null
  const dias = diasParaVencer(fechaVencimiento, hoy)
  if (dias < 0) return 'vencido'
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return 'proximo'
  return null
}

const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

// «12 oct». La fecha es DATEONLY: se arma en hora local para no correr el dia.
export const fechaCortaVencimiento = (fecha) => {
  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-').map(Number)
  return formatoFechaCorta.format(new Date(anio, mes - 1, dia)).replace('.', '')
}

// Texto del aviso para Caja: «Vencido · 12 oct», «Vence hoy», «Vence en 5 días».
export const textoVencimiento = (fechaVencimiento, hoy = hoyLocal()) => {
  const dias = diasParaVencer(fechaVencimiento, hoy)
  if (dias < 0) return `Vencido · ${fechaCortaVencimiento(fechaVencimiento)}`
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${dias} días`
}

export const DESTINO_BADGE = {
  clinico: { label: 'Clínico', className: 'bg-info-soft text-info ' },
  ventas: { label: 'Ventas', className: 'bg-muted text-muted-foreground' },
}

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

export function invalidateInventarioQueries(queryClient) {
  invalidarDominios(queryClient, 'productos')
}
