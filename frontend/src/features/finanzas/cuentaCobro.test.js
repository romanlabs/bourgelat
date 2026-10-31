import { describe, expect, it } from 'vitest'
import { cuentaDelCobro, faltaCuenta } from './cuentaCobro'

const nequi = { id: 'c-nequi', nombre: 'Nequi' }
const banco = { id: 'c-banco', nombre: 'Bancolombia' }

describe('cuentaDelCobro', () => {
  it('solo aplica a transferencias', () => {
    expect(cuentaDelCobro({ metodoPago: 'efectivo', cuentaRecaudoId: 'c-nequi', cuentas: [nequi] })).toBeNull()
  })

  it('con una sola cuenta la elige sola', () => {
    expect(cuentaDelCobro({ metodoPago: 'transferencia', cuentas: [nequi] })).toBe('c-nequi')
  })

  it('con varias usa la elegida y descarta una que ya no está', () => {
    expect(cuentaDelCobro({ metodoPago: 'transferencia', cuentaRecaudoId: 'c-banco', cuentas: [nequi, banco] })).toBe('c-banco')
    expect(cuentaDelCobro({ metodoPago: 'transferencia', cuentaRecaudoId: 'vieja', cuentas: [nequi, banco] })).toBeNull()
  })

  it('sin cuentas configuradas no hay cuenta', () => {
    expect(cuentaDelCobro({ metodoPago: 'transferencia', cuentas: [] })).toBeNull()
  })
})

describe('faltaCuenta', () => {
  it('pide elegir solo cuando hay varias', () => {
    expect(faltaCuenta({ metodoPago: 'transferencia', cuentas: [nequi, banco] })).toBe(true)
    expect(faltaCuenta({ metodoPago: 'transferencia', cuentaRecaudoId: 'c-nequi', cuentas: [nequi, banco] })).toBe(false)
    expect(faltaCuenta({ metodoPago: 'transferencia', cuentas: [nequi] })).toBe(false)
    expect(faltaCuenta({ metodoPago: 'transferencia', cuentas: [] })).toBe(false)
    expect(faltaCuenta({ metodoPago: 'efectivo', cuentas: [nequi, banco] })).toBe(false)
  })
})
