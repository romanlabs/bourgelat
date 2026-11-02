import { describe, expect, it } from 'vitest'
import { crearGestorClaveAbono } from './claveIdempotenciaAbono'

const crearGenerador = () => {
  let n = 0
  return () => `clave-${++n}`
}

const abono = { monto: 50000, metodoPago: 'efectivo', cuentaRecaudoId: null }

describe('crearGestorClaveAbono', () => {
  it('repite la clave al reintentar el mismo abono', () => {
    const gestor = crearGestorClaveAbono(crearGenerador())
    const primera = gestor.obtener(abono)
    expect(gestor.obtener({ ...abono })).toBe(primera)
  })

  it('usa otra clave si cambia el monto, el método o la cuenta', () => {
    const gestor = crearGestorClaveAbono(crearGenerador())
    const original = gestor.obtener(abono)
    const otroMonto = gestor.obtener({ ...abono, monto: 20000 })
    const otroMetodo = gestor.obtener({ ...abono, monto: 20000, metodoPago: 'transferencia' })
    const otraCuenta = gestor.obtener({ ...abono, monto: 20000, metodoPago: 'transferencia', cuentaRecaudoId: 'c1' })
    expect(new Set([original, otroMonto, otroMetodo, otraCuenta]).size).toBe(4)
  })

  it('tras un abono exitoso, uno igual es un cobro nuevo', () => {
    const gestor = crearGestorClaveAbono(crearGenerador())
    const primera = gestor.obtener(abono)
    gestor.reiniciar()
    expect(gestor.obtener(abono)).not.toBe(primera)
  })
})
