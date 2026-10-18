import { describe, expect, it } from 'vitest'
import { buildThermalReceiptHtml } from './reciboTermico'

describe('buildThermalReceiptHtml', () => {
  it('escapa los textos que vienen de datos', () => {
    const html = buildThermalReceiptHtml({
      clinica: { nombre: 'Clínica <b>X</b>' },
      factura: {
        numero: 'FAC-1',
        propietario: { nombre: '<img src=x onerror=alert(1)>' },
        items: [{ descripcion: '<script>alert(1)</script>', cantidad: 1, precioUnitario: 1000, subtotal: 1000 }],
      },
    })
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('Clínica &lt;b&gt;X&lt;/b&gt;')
  })
})
