// Cálculo de precios de los planes (refleja backend/src/config/planes.js).
// precioAnual es el valor POR MES cuando se paga el año por adelantado.

export function calcularPrecioPlan(plan, anual) {
  const mensual = plan?.precioMensual
  const anualPorMes = plan?.precioAnual
  const hayDescuento =
    Boolean(anual && mensual && anualPorMes && mensual > anualPorMes)

  const porMes = anual ? anualPorMes : mensual
  const totalAnual = anual && anualPorMes ? anualPorMes * 12 : null
  const ahorroTotal = hayDescuento ? (mensual - anualPorMes) * 12 : 0
  const ahorroPct = hayDescuento ? Math.round(((mensual - anualPorMes) / mensual) * 100) : 0

  return { porMes, totalAnual, ahorroTotal, ahorroPct }
}

// Mayor porcentaje de ahorro anual entre los planes que lo tienen.
export function maxAhorroPct(planes) {
  return planes.reduce(
    (max, plan) => Math.max(max, calcularPrecioPlan(plan, true).ahorroPct),
    0
  )
}
