import { describe, expect, it } from 'vitest'
import { documentoVenta } from './documentoVenta'

describe('documentoVenta', () => {
  it('una venta sin DIAN es un comprobante, no una factura', () => {
    expect(documentoVenta({ numero: 'FAC-1' }).titulo).toBe('COMPROBANTE DE VENTA')
  })

  it('una venta enviada pero no validada sigue siendo comprobante', () => {
    expect(documentoVenta({ estadoElectronico: 'pendiente', cufe: null }).titulo).toBe('COMPROBANTE DE VENTA')
    expect(documentoVenta({ estadoElectronico: 'rechazada' }).titulo).toBe('COMPROBANTE DE VENTA')
  })

  it('solo la validada por la DIAN con CUFE es factura electrónica', () => {
    const doc = documentoVenta({ estadoElectronico: 'validada', cufe: 'abc123' })
    expect(doc.titulo).toBe('FACTURA ELECTRÓNICA DE VENTA')
    expect(doc.archivo).toBe('Factura')
  })
})
