import { describe, expect, it } from 'vitest'
import { ajustarPaginaAlContenido, buildThermalReceiptHtml, esperarImagenes, logoEnGrises } from './reciboTermico'

describe('logoEnGrises', () => {
  // Imagen de 3 x 3: fondo casi blanco con un punto amarillo en el centro.
  const imagen = () => {
    const pixeles = new Uint8ClampedArray(9 * 4)
    for (let i = 0; i < 9; i += 1) pixeles.set([252, 252, 252, 255], i * 4)
    pixeles.set([250, 210, 20, 255], 4 * 4)
    return pixeles
  }

  it('recorta el margen y deja el fondo en blanco puro', () => {
    const pixeles = imagen()
    expect(logoEnGrises(pixeles, 3, 3)).toEqual({ x: 1, y: 1, ancho: 1, alto: 1 })
    expect(Array.from(pixeles.slice(0, 4))).toEqual([255, 255, 255, 255])
  })

  it('convierte el color en un gris más oscuro que su luz original', () => {
    const pixeles = imagen()
    logoEnGrises(pixeles, 3, 3)
    const [r, g, b] = pixeles.slice(4 * 4, 4 * 4 + 3)
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(r).toBeLessThan(0.299 * 250 + 0.587 * 210 + 0.114 * 20)
  })

  it('trata lo transparente como fondo', () => {
    const pixeles = new Uint8ClampedArray([0, 0, 0, 0])
    expect(logoEnGrises(pixeles, 1, 1)).toBeNull()
    expect(Array.from(pixeles)).toEqual([255, 255, 255, 255])
  })
})

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

  it('muestra el celular colombiano sin el +57 y agrupado', () => {
    const html = buildThermalReceiptHtml({ clinica: { telefono: '+573218943533' }, factura: { items: [] } })
    expect(html).toContain('321 894 3533')
    expect(html).not.toContain('+57')
  })

  it('solo muestra el subtotal cuando difiere del total', () => {
    const simple = buildThermalReceiptHtml({ clinica: {}, factura: { items: [], subtotal: 1000, total: 1000 } })
    expect(simple).not.toContain('Subtotal')
    const conDescuento = buildThermalReceiptHtml({
      clinica: {},
      factura: { items: [], subtotal: 1000, descuento: 100, total: 900 },
    })
    expect(conDescuento).toContain('Subtotal')
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

describe('ajustarPaginaAlContenido', () => {
  it('pide una hoja de 80 mm con el largo del contenido, los márgenes y la holgura', () => {
    const doc = document.implementation.createHTMLDocument()
    doc.body.getBoundingClientRect = () => ({ height: 384 }) // 101,6 mm
    ajustarPaginaAlContenido(doc)
    expect(doc.head.textContent).toContain('size: 80mm 111mm')
    expect(doc.head.textContent).toContain('margin: 3mm')
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
