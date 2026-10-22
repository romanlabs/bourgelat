import { describe, expect, it } from 'vitest'
import { faltaParaCobrar } from './useFinanzasFacturacion'
import { hoyLocal } from '@/features/inventario/inventarioUtils'

const sumarDias = (dias) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return hoyLocal(fecha)
}

const producto = (fechaVencimiento, extra = {}) => ({
  tipo: 'producto',
  descripcion: 'Amoxicilina 250',
  stock: 10,
  fechaVencimiento,
  ...extra,
})

describe('faltaParaCobrar con vencimientos', () => {
  it('bloquea el cobro si hay un producto vencido en el carrito', () => {
    const form = { metodoPago: 'efectivo', items: [producto(sumarDias(-1))] }
    expect(faltaParaCobrar(form)).toMatch(/«Amoxicilina 250» figura vencido/)
  })

  it('deja cobrar un producto próximo a vencer', () => {
    const form = { metodoPago: 'efectivo', items: [producto(sumarDias(5))] }
    expect(faltaParaCobrar(form)).toBe(null)
  })

  it('deja cobrar productos sin fecha y servicios', () => {
    const form = {
      metodoPago: 'efectivo',
      items: [producto(null), { tipo: 'servicio', descripcion: 'Consulta', stock: null }],
    }
    expect(faltaParaCobrar(form)).toBe(null)
  })
})
