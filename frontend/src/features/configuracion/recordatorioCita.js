import { z } from 'zod'

// Mismo rango que el backend (services/recordatorioCitaReglas.js).
export const MINUTOS_MIN = 15
export const MINUTOS_MAX = 2880
export const MINUTOS_POR_DEFECTO = 60

export const desdeMinutos = (minutos = MINUTOS_POR_DEFECTO) => {
  const total = Number.isInteger(minutos) ? minutos : MINUTOS_POR_DEFECTO
  return total % 60 === 0 ? { cantidad: total / 60, unidad: 'horas' } : { cantidad: total, unidad: 'minutos' }
}

export const aMinutos = ({ cantidad, unidad }) =>
  Math.round(Number(cantidad) * (unidad === 'horas' ? 60 : 1))

// `cantidad` se deja pasar tal cual: con el interruptor apagado el input está
// deshabilitado y react-hook-form lo entrega como undefined. Toda la validación
// numérica ocurre solo cuando `activo` es true.
export const esquemaRecordatorioCita = z
  .object({
    activo: z.boolean(),
    cantidad: z.any(),
    unidad: z.enum(['minutos', 'horas']),
  })
  .superRefine((valores, ctx) => {
    if (!valores.activo) return
    const vacio = valores.cantidad === undefined || valores.cantidad === null || valores.cantidad === ''
    const cantidad = vacio ? NaN : Number(valores.cantidad)
    const total = cantidad * (valores.unidad === 'horas' ? 60 : 1)
    if (!Number.isFinite(total) || !Number.isInteger(total) || total < MINUTOS_MIN || total > MINUTOS_MAX) {
      ctx.addIssue({ code: 'custom', path: ['cantidad'], message: 'Elige entre 15 minutos y 48 horas' })
    }
  })
