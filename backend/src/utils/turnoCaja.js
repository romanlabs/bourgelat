'use strict'

// Funciones puras para turnos de caja: vencimiento (turno abierto desde un
// dia calendario anterior) y calculo del cierre (descuadre, umbrales de
// justificacion y revision admin). Sin dependencias de base de datos para
// poder testearse directamente. Se apoyan en el reloj/TZ del proceso, igual
// que horarioAtencionService (ver TZ=America/Bogota en docker-compose/render).

const UMBRAL_COMENTARIO_OPCIONAL = 3000
const UMBRAL_REVISION_ADMIN = 30000
const MIN_CARACTERES_JUSTIFICACION = 20

const convertirANumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto
  }
  const numero = Number.parseFloat(valor)
  return Number.isNaN(numero) ? valorPorDefecto : numero
}

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales
  return Math.round((convertirANumero(valor) + Number.EPSILON) * factor) / factor
}

const inicioDelDia = (fecha) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

// Un turno esta vencido si se abrio en un dia calendario anterior al de hoy.
const esTurnoVencido = (turno, ahora = new Date()) => {
  return inicioDelDia(turno.fechaApertura).getTime() < inicioDelDia(ahora).getTime()
}

// Valida el monto contado y calcula el descuadre del cierre. No toca la BD:
// devuelve { error } o los datos ya listos para el update() del modelo.
const calcularCierreTurno = (turno, { montoFinalContado, observacionesCierre, categoriaDiferencia }) => {
  const montoContado = convertirANumero(montoFinalContado, NaN)

  if (!Number.isFinite(montoContado) || montoContado < 0) {
    return { error: { status: 400, message: 'Monto contado invalido' } }
  }

  const montoInicial = convertirANumero(turno.montoInicial)
  const totalVentasEfectivo = convertirANumero(turno.totalVentasEfectivo)
  const totalIngresosManuales = convertirANumero(turno.totalIngresosManuales)
  const totalEgresosManuales = convertirANumero(turno.totalEgresosManuales)

  const montoFinalEsperado = redondear(
    montoInicial + totalVentasEfectivo + totalIngresosManuales - totalEgresosManuales
  )
  const diferencia = redondear(montoContado - montoFinalEsperado)
  const diferenciaAbs = Math.abs(diferencia)
  const comentarioLimpio = String(observacionesCierre || '').trim()

  if (diferenciaAbs > UMBRAL_COMENTARIO_OPCIONAL) {
    if (comentarioLimpio.length < MIN_CARACTERES_JUSTIFICACION) {
      return {
        error: {
          status: 400,
          message: `Debes justificar la diferencia con al menos ${MIN_CARACTERES_JUSTIFICACION} caracteres`,
        },
      }
    }

    if (!categoriaDiferencia) {
      return { error: { status: 400, message: 'Debes seleccionar una categoria para la diferencia' } }
    }
  }

  return {
    montoFinalEsperado,
    diferencia,
    categoriaDiferencia: diferenciaAbs > 0 ? (categoriaDiferencia || null) : null,
    observacionesCierre: comentarioLimpio || null,
    requiereRevisionAdmin: diferenciaAbs > UMBRAL_REVISION_ADMIN,
    montoFinalContado: montoContado,
  }
}

module.exports = {
  UMBRAL_COMENTARIO_OPCIONAL,
  UMBRAL_REVISION_ADMIN,
  MIN_CARACTERES_JUSTIFICACION,
  convertirANumero,
  redondear,
  esTurnoVencido,
  calcularCierreTurno,
}
