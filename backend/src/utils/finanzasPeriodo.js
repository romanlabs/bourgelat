// Reglas puras del análisis financiero por periodo (GET /reportes/finanzas-periodo).
// Todo trabaja con fechas YYYY-MM-DD en UTC: facturas y gastos son DATEONLY, así
// que no hay hora que mover de día.
const { hoyISO, sumarDiasISO } = require('./vencimiento')

const MAX_MESES_RANGO = 24
// Desde dos meses la serie diaria tiene demasiados puntos para leerse.
const DIAS_PARA_SERIE_MENSUAL = 60

const partes = (fechaISO) => String(fechaISO).slice(0, 10).split('-').map(Number)

const diasEntre = (inicio, fin) => {
  const [a1, m1, d1] = partes(inicio)
  const [a2, m2, d2] = partes(fin)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

const ultimoDiaDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()

// Mueve la fecha N meses conservando el día; si el mes destino es más corto, se
// queda en su último día (31 de marzo − 1 mes = 28/29 de febrero).
const sumarMesesISO = (fechaISO, meses) => {
  const [anio, mes, dia] = partes(fechaISO)
  const destino = new Date(Date.UTC(anio, mes - 1 + meses, 1))
  const anioDestino = destino.getUTCFullYear()
  const mesDestino = destino.getUTCMonth() + 1
  const diaDestino = Math.min(dia, ultimoDiaDelMes(anioDestino, mesDestino))
  return `${anioDestino}-${String(mesDestino).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`
}

// Meses calendario completos que cubre el rango (1 de un mes al último de otro),
// o null si el rango no empieza el 1 o no termina el último día del mes.
const mesesCompletos = (inicio, fin) => {
  const [a1, m1, d1] = partes(inicio)
  const [a2, m2, d2] = partes(fin)
  if (d1 !== 1 || d2 !== ultimoDiaDelMes(a2, m2)) return null
  return (a2 - a1) * 12 + (m2 - m1) + 1
}

// Devuelve el mensaje de error para un 400, o null si el rango sirve.
const validarRango = (fechaInicio, fechaFin) => {
  if (fechaInicio > fechaFin) return 'fechaInicio no puede ser posterior a fechaFin'
  if (fechaFin > sumarMesesISO(fechaInicio, MAX_MESES_RANGO)) {
    return `El periodo no puede pasar de ${MAX_MESES_RANGO} meses`
  }
  return null
}

const granularidadDe = (fechaInicio, fechaFin) =>
  diasEntre(fechaInicio, fechaFin) + 1 >= DIAS_PARA_SERIE_MENSUAL ? 'mes' : 'dia'

// Periodo contra el que se comparan los KPIs. Un periodo de meses completos (un
// año, un trimestre) se compara con los mismos meses de antes, y uno libre con
// los mismos días justo antes. Si el periodo llega al futuro, solo se compara
// lo transcurrido: el año en curso hasta hoy contra el anterior hasta el mismo
// día, no contra el año anterior completo.
const periodoAnterior = (fechaInicio, fechaFin, hoy = hoyISO()) => {
  const finEfectivo = fechaFin > hoy && hoy >= fechaInicio ? hoy : fechaFin
  const meses = mesesCompletos(fechaInicio, fechaFin)

  if (meses) {
    return {
      fechaInicio: sumarMesesISO(fechaInicio, -meses),
      fechaFin: sumarMesesISO(finEfectivo, -meses),
    }
  }

  const dias = diasEntre(fechaInicio, fechaFin) + 1
  return {
    fechaInicio: sumarDiasISO(fechaInicio, -dias),
    fechaFin: sumarDiasISO(finEfectivo, -dias),
  }
}

// Todas las claves de la serie ('YYYY-MM' o 'YYYY-MM-DD'), para que la gráfica
// no salte los meses o días sin movimiento.
const clavesDelPeriodo = (fechaInicio, fechaFin, granularidad) => {
  const claves = []
  if (granularidad === 'mes') {
    let cursor = `${String(fechaInicio).slice(0, 7)}-01`
    const ultimo = String(fechaFin).slice(0, 7)
    while (cursor.slice(0, 7) <= ultimo) {
      claves.push(cursor.slice(0, 7))
      cursor = sumarMesesISO(cursor, 1)
    }
    return claves
  }
  for (let cursor = fechaInicio; cursor <= fechaFin; cursor = sumarDiasISO(cursor, 1)) {
    claves.push(cursor)
  }
  return claves
}

const redondearPesos = (valor) => Math.round(Number(valor || 0) * 100) / 100

const armarSerie = (claves, filasFacturas, filasGastos) => {
  const facturas = new Map(filasFacturas.map((fila) => [fila.periodo, fila]))
  const gastos = new Map(filasGastos.map((fila) => [fila.periodo, fila]))

  return claves.map((periodo) => {
    const ingresos = redondearPesos(facturas.get(periodo)?.ingresos)
    const gasto = redondearPesos(gastos.get(periodo)?.gastos)
    return {
      periodo,
      ingresos,
      gastos: gasto,
      ganancia: redondearPesos(ingresos - gasto),
      ventas: Number(facturas.get(periodo)?.ventas || 0),
    }
  })
}

// Mejor y peor tramo por ganancia, y el de más gasto. Solo cuentan los tramos
// con movimiento: los meses que aún no llegan no son «el peor mes».
const calcularDestacados = (serie) => {
  const conMovimiento = serie.filter((fila) => fila.ingresos > 0 || fila.gastos > 0)
  if (conMovimiento.length === 0) return { mejor: null, peor: null, masGasto: null }

  const extremo = (campo, comparar) =>
    conMovimiento.reduce((elegido, fila) => (comparar(fila[campo], elegido[campo]) ? fila : elegido))

  const mejor = extremo('ganancia', (a, b) => a > b)
  const peor = extremo('ganancia', (a, b) => a < b)
  const masGasto = extremo('gastos', (a, b) => a > b)

  return {
    mejor: { periodo: mejor.periodo, valor: mejor.ganancia },
    // Con un solo tramo, el mejor y el peor serían el mismo: no se repite.
    peor: conMovimiento.length > 1 ? { periodo: peor.periodo, valor: peor.ganancia } : null,
    masGasto: masGasto.gastos > 0 ? { periodo: masGasto.periodo, valor: masGasto.gastos } : null,
  }
}

const margenDe = (ingresos, ganancia) =>
  ingresos > 0 ? Number(((ganancia / ingresos) * 100).toFixed(1)) : null

const ticketPromedioDe = (ingresos, ventas) => (ventas > 0 ? redondearPesos(ingresos / ventas) : 0)

module.exports = {
  MAX_MESES_RANGO,
  sumarMesesISO,
  validarRango,
  granularidadDe,
  periodoAnterior,
  clavesDelPeriodo,
  armarSerie,
  calcularDestacados,
  margenDe,
  ticketPromedioDe,
  redondearPesos,
}
