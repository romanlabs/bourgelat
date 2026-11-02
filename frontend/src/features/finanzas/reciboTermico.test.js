import { describe, expect, it } from 'vitest'
import { buildThermalReceiptHtml, esperarImagenes } from './reciboTermico'

describe('buildThermalReceiptHtml', () => {
  it('muestra el logo de la clínica y sus datos de contacto', () => {
    const html = buildThermalReceiptHtml({
      clinica: {
        nombre: 'San Roque',
        logo: 'https://api.bourgelat.co/uploads/clinicas/logo.png',
        direccion: 'Cra. 70 # 44-21',
        ciudad: 'Medellín',
        telefono: '6044123390',
      },
      factura: { numero: 'V-1', items: [] },
    })
    expect(html).toContain('<img class="logo" src="https://api.bourgelat.co/uploads/clinicas/logo.png"')
    expect(html).toContain('Cra. 70 # 44-21')
    expect(html).toContain('Medellín · 6044123390')
  })

  it('sin logo, o con uno que no es una dirección web, no pone imagen', () => {
    for (const logo of [undefined, '', 'javascript:alert(1)', '"><script>alert(1)</script>']) {
      const html = buildThermalReceiptHtml({ clinica: { nombre: 'X', logo }, factura: { items: [] } })
      expect(html).not.toContain('<img')
      expect(html).not.toContain('javascript:')
      expect(html).not.toContain('<script>')
    }
  })

  it('no redondea las cantidades fraccionadas', () => {
    const html = buildThermalReceiptHtml({
      clinica: {},
      factura: { items: [{ descripcion: 'Vacuna', cantidad: 0.5, precioUnitario: 1000, subtotal: 500 }] },
    })
    expect(html).toContain('0,5 × 1.000')
  })

  it('muestra impuesto, saldo y efectivo solo cuando aplican', () => {
    const conTodo = buildThermalReceiptHtml({
      clinica: {},
      factura: { items: [], impuesto: 1900, saldoPendiente: 5000, estado: 'parcial' },
      pago: { recibido: 20000, vuelto: 1000 },
    })
    expect(conTodo).toContain('Impuesto')
    expect(conTodo).toContain('Saldo pendiente')
    expect(conTodo).toContain('Recibido')
    expect(conTodo).toContain('Cambio')

    const sinNada = buildThermalReceiptHtml({ clinica: {}, factura: { items: [] } })
    for (const texto of ['Impuesto', 'Saldo pendiente', 'Recibido', 'Cambio', 'Descuento']) {
      expect(sinNada).not.toContain(texto)
    }
  })

  it('una venta anulada no muestra saldo por cobrar', () => {
    const html = buildThermalReceiptHtml({
      clinica: {},
      factura: { items: [], saldoPendiente: 5000, estado: 'anulada' },
    })
    expect(html).toContain('ANULADA')
    expect(html).not.toContain('Saldo pendiente')
  })

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

  it('sin validación DIAN se titula comprobante, no factura', () => {
    const html = buildThermalReceiptHtml({ clinica: {}, factura: { numero: 'FAC-2', items: [] } })
    expect(html).toContain('COMPROBANTE DE VENTA')
    expect(html).toContain('no es factura electrónica')
    expect(html).not.toContain('FACTURA')
  })

  it('validada por la DIAN se titula factura electrónica y lleva el CUFE', () => {
    const html = buildThermalReceiptHtml({
      clinica: {},
      factura: { numero: 'SETP-9', items: [], estadoElectronico: 'validada', cufe: 'cufe123' },
    })
    expect(html).toContain('FACTURA ELECTRÓNICA DE VENTA')
    expect(html).toContain('CUFE: cufe123')
    expect(html).not.toContain('no es factura electrónica')
  })
})

describe('esperarImagenes', () => {
  const documento = () => {
    const doc = document.implementation.createHTMLDocument()
    const img = doc.createElement('img')
    doc.body.appendChild(img)
    return { doc, img }
  }

  it('espera a que cargue la imagen y la conserva', async () => {
    const { doc, img } = documento()
    const espera = esperarImagenes(doc, 1000)
    img.dispatchEvent(new Event('load'))
    await espera
    expect(doc.images).toHaveLength(1)
  })

  it('quita la imagen que falla para que no salga rota', async () => {
    const { doc, img } = documento()
    const espera = esperarImagenes(doc, 1000)
    img.dispatchEvent(new Event('error'))
    await espera
    expect(doc.images).toHaveLength(0)
  })

  it('no se queda esperando una imagen que nunca responde', async () => {
    const { doc } = documento()
    await esperarImagenes(doc, 5)
    expect(doc.images).toHaveLength(0)
  })
})
