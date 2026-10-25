// Reglas puras del Resumen de Finanzas: rango del mes, lectura de la serie
// diaria, cómo pagan y la edad de la cartera.
import { chartColors } from '@/lib/theme'
import { fechaLocal } from '@/lib/fecha'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const partes = (iso) => String(iso).slice(0, 10).split('-').map(Number)

// '2026-10' → { fechaInicio: '2026-10-01', fechaFin: '2026-10-31' }
export const rangoDelMes = (anioMes) => {
  const [anio, mes] = partes(`${anioMes}-01`)
  return {
    fechaInicio: `${anioMes}-01`,
    fechaFin: fechaLocal(new Date(anio, mes, 0)),
  }
}

export const nombreMes = (anioMes) => MESES[partes(`${anioMes}-01`)[1] - 1] || ''

// '2026-10-13' → 'martes 13'
export const nombreDia = (fechaISO) => {
  const [anio, mes, dia] = partes(fechaISO)
  return `${DIAS_SEMANA[new Date(anio, mes - 1, dia).getDay()]} ${dia}`
}

// Lectura de una serie diaria: el mejor día, cuántos días hubo ventas y el
// promedio de esos días (los cerrados no bajan el promedio).
export const leerSerieDiaria = (serie = []) => {
  const conVentas = serie.filter((fila) => fila.ingresos > 0 || fila.ventas > 0)
  const mejor = conVentas.reduce(
    (elegido, fila) => (!elegido || fila.ingresos > elegido.ingresos ? fila : elegido),
    null
  )
  const total = conVentas.reduce((suma, fila) => suma + fila.ingresos, 0)
  return {
    mejor: mejor && mejor.ingresos > 0 ? mejor : null,
    diasConVentas: conVentas.length,
    promedioDiaConVentas: conVentas.length ? Math.round(total / conVentas.length) : 0,
  }
}

// Cómo pagan: Nequi, Daviplata y bancos van como transferencia (igual que la
// venta) y las tarjetas en una sola franja. El color sigue al método, no a su
// puesto, para que «Efectivo» sea del mismo color todos los meses.
const GRUPOS_METODO = [
  { id: 'transferencia', label: 'Transferencia', metodos: ['transferencia', 'nequi', 'daviplata'] },
  { id: 'efectivo', label: 'Efectivo', metodos: ['efectivo'] },
  { id: 'tarjeta', label: 'Tarjeta', metodos: ['tarjeta', 'tarjeta_debito', 'tarjeta_credito'] },
  { id: 'credito', label: 'A crédito', metodos: ['credito'] },
  { id: 'otro', label: 'Otro', metodos: ['otro'] },
]

const COLORES_METODO = {
  claro: {
    transferencia: chartColors.categorica[0],
    efectivo: chartColors.categorica[1],
    tarjeta: chartColors.categorica[2],
    credito: chartColors.categorica[7],
    otro: chartColors.categorica[5],
  },
  oscuro: {
    transferencia: chartColors.oscuro.petroleo,
    efectivo: chartColors.categorica[1],
    tarjeta: chartColors.categorica[7],
    credito: chartColors.categorica[5],
    otro: chartColors.estados.neutro,
  },
}

export const agruparMetodosPago = (porMetodo = {}, { oscuro = false } = {}) => {
  const colores = oscuro ? COLORES_METODO.oscuro : COLORES_METODO.claro
  const conocidos = new Set(GRUPOS_METODO.flatMap((grupo) => grupo.metodos))
  const grupos = GRUPOS_METODO.map((grupo) => ({
    id: grupo.id,
    label: grupo.label,
    color: colores[grupo.id],
    valor: grupo.metodos.reduce((suma, metodo) => suma + Number(porMetodo[metodo] || 0), 0),
  }))
  // Un método que no conocemos no se pierde: suma en «Otro».
  const otro = grupos.find((grupo) => grupo.id === 'otro')
  for (const [metodo, valor] of Object.entries(porMetodo)) {
    if (!conocidos.has(metodo)) otro.valor += Number(valor || 0)
  }

  const total = grupos.reduce((suma, grupo) => suma + grupo.valor, 0)
  return grupos
    .filter((grupo) => grupo.valor > 0)
    .map((grupo) => ({ ...grupo, porcentaje: total ? Math.round((grupo.valor / total) * 100) : 0 }))
}

export const diasDesde = (fechaISO, hoy = fechaLocal()) => {
  if (!fechaISO) return null
  const [a1, m1, d1] = partes(fechaISO)
  const [a2, m2, d2] = partes(hoy)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

// Config de ChartContainer (shadcn): cada serie expone `--color-<clave>` por
// tema. Cobrado y gastos: petróleo y ámbar, validados para daltónicos en los
// dos modos; en claro el ámbar oscuro queda en 2,9:1, por eso hay leyenda y tabla.
export const CONFIG_SERIE = {
  ingresos: { label: 'Cobrado', theme: { light: chartColors.categorica[0], dark: chartColors.oscuro.petroleo } },
  gastos: { label: 'Gastos', theme: { light: chartColors.categorica[8], dark: chartColors.categorica[1] } },
  resalte: { label: 'Hoy', theme: { light: chartColors.categorica[1], dark: chartColors.categorica[1] } },
  anterior: { label: 'Mes anterior', theme: { light: chartColors.estados.neutro, dark: chartColors.oscuro.neutro } },
  proyeccion: { label: 'Al ritmo actual', theme: { light: chartColors.categorica[0], dark: chartColors.oscuro.petroleo } },
  // Ganancia y pérdida son estado (bueno/malo), no identidad: además del color
  // las separa la dirección de la barra y el signo de la cifra.
  positivo: { label: 'Ganancia', theme: { light: chartColors.estados.success, dark: chartColors.oscuro.exito } },
  negativo: { label: 'Pérdida', theme: { light: chartColors.estados.danger, dark: chartColors.oscuro.peligro } },
}

// Lo que no ha pasado no se dibuja en cero: un mes que no llega no es un mes malo.
export const hastaHoy = (serie = [], hoy = fechaLocal()) =>
  serie.filter((fila) => fila.periodo <= (fila.periodo.length === 7 ? hoy.slice(0, 7) : hoy))

// Curva del mes: lo cobrado acumulado día a día, el del mes anterior en el
// mismo día y, en el mes en curso, la proyección al ritmo que va (promedio por
// día transcurrido). Los días que no han pasado no tienen valor real.
export const curvaAcumulada = (serieMes = [], serieAnterior = [], hoy = fechaLocal()) => {
  if (!serieMes.length) return { filas: [], cierre: null, ritmo: 0 }
  const acumular = (serie) => {
    let suma = 0
    return serie.map((fila) => (suma += Number(fila.ingresos || 0)))
  }
  const actual = acumular(serieMes)
  const anterior = acumular(serieAnterior)
  const transcurridos = serieMes.filter((fila) => fila.periodo <= hoy).length
  const enCurso = transcurridos > 0 && transcurridos < serieMes.length
  const llevado = transcurridos ? actual[transcurridos - 1] : 0
  const ritmo = transcurridos ? llevado / transcurridos : 0

  const filas = serieMes.map((fila, i) => {
    const dia = i + 1
    const pasado = dia <= transcurridos
    return {
      dia,
      periodo: fila.periodo,
      ingresos: pasado ? actual[i] : null,
      anterior: i < anterior.length ? anterior[i] : null,
      // La proyección arranca en hoy para que la línea salga de la curva real.
      proyeccion: enCurso && dia >= transcurridos ? Math.round(llevado + ritmo * (dia - transcurridos)) : null,
    }
  })

  return {
    filas,
    ritmo: Math.round(ritmo),
    cierre: enCurso ? Math.round(ritmo * serieMes.length) : null,
    llevado,
    anteriorALaFecha: transcurridos && anterior.length ? anterior[Math.min(transcurridos, anterior.length) - 1] : null,
  }
}

// '2026-10' → '2026-09'
export const mesAnterior = (anioMes) => {
  const [anio, mes] = partes(`${anioMes}-01`)
  return fechaLocal(new Date(anio, mes - 2, 1)).slice(0, 7)
}

// Antigüedad de la cartera: tramos fijos en orden, cada uno con su tono de
// estado (lo viejo es más grave). `hasta` en días, inclusive.
export const TRAMOS_ANTIGUEDAD = [
  { id: 'reciente', label: '0 a 30 días', hasta: 30, tono: 'warning' },
  { id: 'mes', label: '31 a 60 días', hasta: 60, tono: 'warning' },
  { id: 'dosMeses', label: '61 a 90 días', hasta: 90, tono: 'danger' },
  { id: 'vieja', label: 'Más de 90 días', hasta: Infinity, tono: 'danger' },
]

export const tramoDe = (dias) => TRAMOS_ANTIGUEDAD.find((tramo) => dias <= tramo.hasta) || TRAMOS_ANTIGUEDAD.at(-1)

// Suma por tramo el saldo de cada venta según su fecha (no la del cliente:
// un cliente puede tener una deuda vieja y otra de ayer).
export const antiguedadCartera = (clientes = [], hoy = fechaLocal()) => {
  const tramos = TRAMOS_ANTIGUEDAD.map((tramo) => ({ ...tramo, total: 0, ventas: 0 }))
  for (const cliente of clientes) {
    for (const factura of cliente.facturas || []) {
      const tramo = tramos.find((t) => t.id === tramoDe(diasDesde(factura.fecha, hoy)).id)
      tramo.total += Number(factura.saldoPendiente || 0)
      tramo.ventas += 1
    }
  }
  return tramos
}

// Plazo del crédito. Opciones rápidas del punto de venta ('' = sin plazo).
export const PLAZOS_CREDITO = [8, 15, 30, 60]

export const sumarDias = (fechaISO, dias) => {
  const [anio, mes, dia] = partes(fechaISO)
  return fechaLocal(new Date(anio, mes - 1, dia + Number(dias)))
}

// Cómo va una venta a crédito frente a su plazo: vencida, vence en los próximos
// 3 días, o al día. Sin plazo no hay estado.
export const estadoVencimiento = (fechaVencimiento, hoy = fechaLocal()) => {
  if (!fechaVencimiento) return null
  const dias = diasDesde(hoy, fechaVencimiento)
  if (dias < 0) return { tipo: 'vencida', dias: -dias }
  if (dias <= 3) return { tipo: 'pronto', dias }
  return { tipo: 'alDia', dias }
}

// Enlace de WhatsApp con el mensaje escrito; lo envía la persona, no la app.
// Un celular colombiano de 10 dígitos (3xx) lleva el indicativo 57.
export const enlaceWhatsApp = (telefono, mensaje) => {
  let digitos = String(telefono || '').replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) digitos = `57${digitos}`
  if (digitos.length < 10) return null
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`
}

// Estado de un mes en la cuadrícula del año.
export const estadoMes = (fila, mesActual = fechaLocal().slice(0, 7)) => {
  if (fila.periodo > mesActual) return 'futuro'
  if (fila.periodo === mesActual) return 'actual'
  return fila.ingresos || fila.gastos || fila.ventas ? 'cerrado' : 'sinMovimiento'
}
