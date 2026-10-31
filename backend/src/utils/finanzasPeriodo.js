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

// `ingresos` es dinero que entró: lo cobrado de contado en las ventas del tramo
// más los abonos recibidos en él, aunque el crédito se haya vendido antes.
// `vendido` es lo facturado (incluye el fiado que aún se debe).
const armarSerie = (claves, filasFacturas, filasGastos, filasAbonos = []) => {
  const facturas = new Map(filasFacturas.map((fila) => [fila.periodo, fila]))
  const gastos = new Map(filasGastos.map((fila) => [fila.periodo, fila]))
  const abonos = new Map(filasAbonos.map((fila) => [fila.periodo, fila]))

  return claves.map((periodo) => {
    const ingresos = redondearPesos(
      Number(facturas.get(periodo)?.cobrado || 0) + Number(abonos.get(periodo)?.cobrado || 0)
    )
    const gasto = redondearPesos(gastos.get(periodo)?.gastos)
    return {
      periodo,
      ingresos,
      vendido: redondearPesos(facturas.get(periodo)?.vendido),
      gastos: gasto,
      ganancia: redondearPesos(ingresos - gasto),
      ventas: Number(facturas.get(periodo)?.ventas || 0),
    }
  })
}

// Colombia es UTC−5 todo el año: un día local va de 00:00−05:00 a 00:00−05:00
// del siguiente. Se filtra el timestamp crudo para usar el índice (clinicaId, createdAt).
const OFFSET_BOGOTA = '-05:00'
const limitesBogota = (fechaInicio, fechaFin) => ({
  desde: `${fechaInicio}T00:00:00${OFFSET_BOGOTA}`,
  hasta: `${sumarDiasISO(fechaFin, 1)}T00:00:00${OFFSET_BOGOTA}`,
})

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

// El resumen de un mes lo ven todos los que entran a Finanzas; los periodos
// largos son del análisis completo (admin con plan Clínica).
const esUnSoloMes = (fechaInicio, fechaFin) =>
  String(fechaInicio).slice(0, 7) === String(fechaFin).slice(0, 7)

// Completo = admin con la funcionalidad del plan. Sin eso solo se permite un mes.
const alcanceAnalisis = ({ roles = [], tieneReportesCompletos, fechaInicio, fechaFin }) => {
  const esAdmin = roles.some((rol) => rol === 'admin' || rol === 'superadmin')
  const completo = esAdmin && Boolean(tieneReportesCompletos)
  if (completo || esUnSoloMes(fechaInicio, fechaFin)) return { permitido: true, completo }
  return {
    permitido: false,
    completo: false,
    message: esAdmin
      ? 'El análisis de periodos largos (trimestre, año o rango libre) es del plan Clínica.'
      : 'El análisis de periodos largos es solo para administración.',
  }
}

// Sin análisis completo se responde solo lo que entró y lo que se debe: nada de
// gastos ni ganancia (la rentabilidad es del dueño) ni de rankings de ventas.
const recortarABasico = (reporte) => ({
  alcance: 'basico',
  periodo: reporte.periodo,
  resumen: {
    ingresos: reporte.resumen.ingresos,
    vendido: reporte.resumen.vendido,
    abonos: reporte.resumen.abonos,
    ventas: reporte.resumen.ventas,
    ticketPromedio: reporte.resumen.ticketPromedio,
    porCobrar: reporte.resumen.porCobrar,
    creditosPendientes: reporte.resumen.creditosPendientes,
    creditoMasAntiguo: reporte.resumen.creditoMasAntiguo,
  },
  anterior: {
    ingresos: reporte.anterior.ingresos,
    vendido: reporte.anterior.vendido,
    ventas: reporte.anterior.ventas,
    ticketPromedio: reporte.anterior.ticketPromedio,
  },
  serie: reporte.serie.map(({ periodo, ingresos, vendido, ventas }) => ({ periodo, ingresos, vendido, ventas })),
})

const margenDe = (ingresos, ganancia) =>
  ingresos > 0 ? Number(((ganancia / ingresos) * 100).toFixed(1)) : null

const ticketPromedioDe = (ingresos, ventas) => (ventas > 0 ? redondearPesos(ingresos / ventas) : 0)

// ── Cobrado por medio de pago (GET /reportes/medios-pago) ───────────────────
// Los medios con que entra la plata: los mismos del gasto, para restar lo
// pagado por cada medio sin cruces. 'credito' no es un medio: el fiado entra
// después, por el medio de cada abono. Cualquier banco o billetera es
// transferencia (las ventas viejas con Nequi o Daviplata también) y las dos
// tarjetas cuentan como una.
const MEDIOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'otro']
const MEDIO_DE_METODO = {
  nequi: 'transferencia',
  daviplata: 'transferencia',
  tarjeta_debito: 'tarjeta',
  tarjeta_credito: 'tarjeta',
}
const medioDe = (metodo) => MEDIO_DE_METODO[metodo] || (MEDIOS_PAGO.includes(metodo) ? metodo : 'otro')

// Fecha local de Bogotá (UTC−5) de un timestamp: el día en que se recibió un abono.
const fechaBogota = (instante) =>
  new Date(new Date(instante).getTime() - 5 * 3600000).toISOString().slice(0, 10)

const diaSemana = (fechaISO) => {
  const [anio, mes, dia] = partes(fechaISO)
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()
}

// Reparte lo cobrado entre los medios con la regla de COBRADO_DE_CONTADO: de
// cada venta, lo que entró en el momento (total − saldo − abonos) por el medio
// de la venta; de cada abono, su monto por el medio del abono. Así la suma de
// todos los medios es el «cobrado» del Resumen. Se hace en memoria porque el
// método de pago está cifrado.
//   facturas:         [{ id, fecha, total, saldoPendiente, metodoPago }]
//   abonosPorFactura: { [facturaId]: suma de sus abonos (de cualquier fecha) }
//   abonos:           [{ fecha: 'YYYY-MM-DD', monto, metodoPago }] recibidos en el periodo
//   claves:           tramos de la serie (clavesDelPeriodo); vacío = sin serie
const agregarPorMedio = ({ facturas = [], abonosPorFactura = {}, abonos = [], claves = [], granularidad = 'dia' }) => {
  const medios = Object.fromEntries(
    MEDIOS_PAGO.map((id) => [id, { id, cobrado: 0, deVentas: 0, deAbonos: 0, ventas: 0, abonos: 0, porDiaSemana: [0, 0, 0, 0, 0, 0, 0] }])
  )
  const serie = new Map(claves.map((periodo) => [periodo, Object.fromEntries(MEDIOS_PAGO.map((id) => [id, 0]))]))
  const tramoDe = (fecha) => (granularidad === 'mes' ? String(fecha).slice(0, 7) : String(fecha).slice(0, 10))

  const sumar = (medio, monto, fecha, origen) => {
    const fila = medios[medio]
    fila.cobrado += monto
    if (origen === 'venta') {
      fila.deVentas += monto
      fila.ventas += 1
    } else {
      fila.deAbonos += monto
      fila.abonos += 1
    }
    fila.porDiaSemana[diaSemana(fecha)] += monto
    const tramo = serie.get(tramoDe(fecha))
    if (tramo) tramo[medio] += monto
  }

  for (const factura of facturas) {
    const contado =
      Number(factura.total || 0) - Number(factura.saldoPendiente || 0) - Number(abonosPorFactura[factura.id] || 0)
    // Una venta a crédito no trae plata en el momento: no cuenta como operación.
    if (contado > 0) sumar(medioDe(factura.metodoPago), contado, factura.fecha, 'venta')
  }
  for (const abono of abonos) {
    const monto = Number(abono.monto || 0)
    if (monto > 0) sumar(medioDe(abono.metodoPago), monto, abono.fecha, 'abono')
  }

  const total = redondearPesos(Object.values(medios).reduce((suma, fila) => suma + fila.cobrado, 0))
  return {
    total,
    medios: MEDIOS_PAGO.map((id) => {
      const fila = medios[id]
      const operaciones = fila.ventas + fila.abonos
      return {
        ...fila,
        cobrado: redondearPesos(fila.cobrado),
        deVentas: redondearPesos(fila.deVentas),
        deAbonos: redondearPesos(fila.deAbonos),
        operaciones,
        ticketPromedio: ticketPromedioDe(fila.cobrado, operaciones),
        participacion: total > 0 ? Number(((fila.cobrado / total) * 100).toFixed(1)) : 0,
        porDiaSemana: fila.porDiaSemana.map(redondearPesos),
      }
    }),
    serie: [...serie].map(([periodo, valores]) => ({
      periodo,
      ...Object.fromEntries(Object.entries(valores).map(([id, valor]) => [id, redondearPesos(valor)])),
    })),
  }
}

module.exports = {
  MEDIOS_PAGO,
  agregarPorMedio,
  fechaBogota,
  MAX_MESES_RANGO,
  sumarMesesISO,
  validarRango,
  granularidadDe,
  periodoAnterior,
  clavesDelPeriodo,
  armarSerie,
  limitesBogota,
  esUnSoloMes,
  alcanceAnalisis,
  recortarABasico,
  calcularDestacados,
  margenDe,
  ticketPromedioDe,
  redondearPesos,
}
