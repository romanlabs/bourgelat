import { toast } from 'sonner'
import {
  formaDePago,
  formatCurrency,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'
import { documentoVenta, esFacturaElectronica } from './documentoVenta'

// Compartido entre el historial de facturas y el POS: ambos imprimen la misma
// tirilla, uno sobre una factura archivada y otro sobre la recien emitida.

export const formatDateTime = (value) => {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    )
  } catch {
    return 'Sin fecha'
  }
}

// La tirilla se escribe como HTML en un iframe del mismo origen: todo texto que
// venga de datos (producto, cliente, clínica) se escapa para que un nombre con
// etiquetas no se ejecute al imprimir.
export const escaparHtml = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Las cantidades pueden ser fraccionadas (0,5 ml): no se redondean a entero.
const formatCantidad = (value) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value || 0))

const fila = (etiqueta, valor) =>
  `<div class="row"><span>${etiqueta}</span><span class="value">${valor}</span></div>`

// Solo direcciones web: el valor del logo se guarda como texto libre en la clínica.
const urlLogo = (clinica) => (/^https?:\/\//i.test(clinica?.logo || '') ? clinica.logo : '')

// El celular se guarda como +573218943533; en papel se lee mejor 321 894 3533.
const telefonoLegible = (telefono) =>
  String(telefono || '').replace(/^\+57(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')

/**
 * @param pago Opcional: `{ recibido, vuelto }` en efectivo. No se guarda con la
 * factura, así que solo lo conoce el POS justo después de cobrar.
 */
export const buildThermalReceiptHtml = ({ factura, clinica, pago }) => {
  const nombreClinica = escaparHtml(clinica?.nombreComercial || clinica?.nombre || 'Bourgelat')
  const logo = urlLogo(clinica)
  const identificacion = clinica?.nit ? `NIT ${escaparHtml(clinica.nit)}` : ''
  const direccion = escaparHtml(clinica?.direccion || '')
  const contacto = escaparHtml([clinica?.ciudad, telefonoLegible(clinica?.telefono)].filter(Boolean).join(' · '))
  const numero = escaparHtml(factura?.numero || '')
  const descuento = Number(factura?.descuento || 0)
  const impuesto = Number(factura?.impuesto || 0)
  const saldo = Number(factura?.saldoPendiente || 0)
  const anulada = factura?.estado === 'anulada'
  const electronica = esFacturaElectronica(factura)
  const lineas = (factura?.items || [])
    .map((item) => {
      const cantidad = formatCantidad(item.cantidad)
      const unitario = formatNumber(item.precioUnitario)
      const subtotal = formatNumber(item.subtotal)
      return `
        <div class="item">
          <div class="item-name">${escaparHtml(item.descripcion || 'Concepto')}</div>
          <div class="row"><span>${cantidad} × ${unitario}</span><span class="num">${subtotal}</span></div>
        </div>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Tirilla ${numero}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            width: 100%;
            max-width: 72mm;
            margin: 0 auto;
            /* Solo negro: la impresora térmica convierte los grises en puntos. */
            color: #000;
            font-size: 12px;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }
          .header { display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; }
          .logo {
            display: block;
            max-width: 60%;
            max-height: 18mm;
            margin-bottom: 5px;
            object-fit: contain;
            filter: grayscale(1) contrast(1.2);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .clinic-name { font-size: 14px; font-weight: 700; text-transform: uppercase; }
          .doc-title { text-align: center; font-weight: 700; }
          .doc-number { text-align: center; font-size: 14px; font-weight: 700; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .rows { display: flex; flex-direction: column; gap: 2px; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .row > span:first-child { flex-shrink: 0; }
          .row .value { text-align: right; }
          .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
          .item { margin-bottom: 6px; }
          .item:last-child { margin-bottom: 0; }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            margin: 6px 0;
            padding: 4px 0;
            font-size: 17px;
            font-weight: 700;
          }
          .saldo { font-weight: 700; }
          .stamp {
            border: 2px solid #000;
            text-align: center;
            font-weight: 700;
            letter-spacing: 3px;
            padding: 3px 0;
            margin-bottom: 8px;
          }
          .cufe { font-size: 10px; word-break: break-all; }
          .footer { display: flex; flex-direction: column; gap: 2px; text-align: center; }
          .thanks { font-weight: 700; }
          .legal { padding-top: 3px; font-size: 10px; line-height: 1.25; }
          .made-with { font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logo ? `<img class="logo" src="${escaparHtml(logo)}" alt="" />` : ''}
          <div class="clinic-name">${nombreClinica}</div>
          ${identificacion ? `<div>${identificacion}</div>` : ''}
          ${direccion ? `<div>${direccion}</div>` : ''}
          ${contacto ? `<div>${contacto}</div>` : ''}
        </div>
        <div class="divider"></div>
        ${anulada ? '<div class="stamp">ANULADA</div>' : ''}
        <div class="doc-title">${documentoVenta(factura).titulo}</div>
        <div class="doc-number">${numero || '-'}</div>
        <div class="rows" style="margin-top: 6px">
          ${fila('Fecha', formatDateTime(factura?.createdAt || factura?.fecha))}
          ${fila('Atendió', escaparHtml(factura?.usuario?.nombre || '-'))}
          ${fila('Cliente', escaparHtml(factura?.propietario?.nombre || 'Consumidor final'))}
        </div>
        <div class="divider"></div>
        ${lineas || '<div>Sin ítems registrados.</div>'}
        ${descuento > 0 || impuesto > 0 ? '<div class="divider"></div>' : ''}
        <div class="rows">
          ${descuento > 0 || impuesto > 0 ? fila('Subtotal', `<span class="num">${formatNumber(factura?.subtotal)}</span>`) : ''}
          ${descuento > 0 ? fila('Descuento', `<span class="num">-${formatNumber(descuento)}</span>`) : ''}
          ${impuesto > 0 ? fila('Impuesto', `<span class="num">${formatNumber(impuesto)}</span>`) : ''}
          <div class="total-row"><span>TOTAL</span><span class="num">${formatCurrency(factura?.total)}</span></div>
          ${fila('Pago', escaparHtml(formaDePago(factura) || '-'))}
          ${pago ? fila('Recibido', `<span class="num">${formatNumber(pago.recibido)}</span>`) : ''}
          ${pago ? fila('Cambio', `<span class="num">${formatNumber(pago.vuelto)}</span>`) : ''}
          ${!anulada && saldo > 0 ? `<div class="saldo">${fila('Saldo pendiente', `<span class="num">${formatCurrency(saldo)}</span>`)}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="footer">
          <div class="thanks">Gracias por confiar en nosotros</div>
          ${electronica
            ? `<div class="cufe">CUFE: ${escaparHtml(factura.cufe)}</div>`
            : '<div class="legal">Este documento no es factura electrónica.</div>'}
          <div class="made-with">Hecho con Bourgelat</div>
        </div>
      </body>
    </html>
  `
}

const ESPERA_LOGO_MS = 3000

/**
 * El navegador no espera las imágenes antes de imprimir: sin esto, el logo sale
 * en blanco la primera vez. Un logo que falla o tarda se quita, porque es
 * decorativo y la venta no puede quedarse sin su tirilla.
 */
export const esperarImagenes = (doc, esperaMs = ESPERA_LOGO_MS) =>
  Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const terminar = (cargo) => {
            clearTimeout(limite)
            if (!cargo) img.remove()
            resolve()
          }
          const limite = setTimeout(() => terminar(false), esperaMs)
          img.addEventListener('load', () => terminar(true), { once: true })
          img.addEventListener('error', () => terminar(false), { once: true })
        })
    )
  )

const ANCHO_ROLLO_MM = 80
const MARGEN_MM = 3
// Holgura para que una diferencia de redondeo no parta la tirilla en dos hojas.
const HOLGURA_MM = 3
const MM_POR_PX = 25.4 / 96

/**
 * Pide una hoja delgada del largo exacto del contenido: así el PDF y la vista
 * previa salen como tirilla y no en una hoja carta. Se mide después de cargar
 * el logo, porque el logo cambia el alto.
 */
export const ajustarPaginaAlContenido = (doc) => {
  const altoContenido = Math.ceil(doc.body.getBoundingClientRect().height * MM_POR_PX)
  const estilo = doc.createElement('style')
  estilo.textContent = `@page { size: ${ANCHO_ROLLO_MM}mm ${altoContenido + MARGEN_MM * 2 + HOLGURA_MM}mm; margin: ${MARGEN_MM}mm; }`
  doc.head.appendChild(estilo)
}

/**
 * Imprime la tirilla en un iframe oculto para no sacar al cajero de la pantalla
 * donde está: el POS sigue abierto detrás del diálogo de impresión.
 */
export const imprimirTirilla = async ({ factura, clinica, pago }) => {
  if (!factura) {
    toast.error('No hay factura para imprimir.')
    return
  }

  const html = buildThermalReceiptHtml({ factura, clinica, pago })
  const iframe = document.createElement('iframe')
  // Lleva el ancho de impresión, sin altura: con ancho 0 no se podría medir el contenido.
  iframe.style.cssText = `position:fixed;width:${ANCHO_ROLLO_MM - MARGEN_MM * 2}mm;height:0;border:0;opacity:0;pointer-events:none`
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    toast.error('No se pudo preparar la tirilla para impresión.')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()
  await esperarImagenes(doc)
  ajustarPaginaAlContenido(doc)

  // No todos los navegadores detienen el código mientras está abierto el diálogo
  // de impresión: el iframe se quita al cerrarlo, con un tope por si no avisan.
  iframe.contentWindow.addEventListener('afterprint', () => iframe.remove(), { once: true })
  setTimeout(() => iframe.remove(), 60000)
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
}
