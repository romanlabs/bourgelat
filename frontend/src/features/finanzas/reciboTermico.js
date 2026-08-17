import { toast } from 'sonner'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'

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

export const buildThermalReceiptHtml = ({ factura, clinica }) => {
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'
  const identificacion = clinica?.nit ? `NIT ${clinica.nit}` : ''
  const ubicacion = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')
  const descuento = Number(factura?.descuento || 0)
  const anulada = factura?.estado === 'anulada'
  const lineas = (factura?.items || [])
    .map((item) => {
      const cantidad = formatNumber(item.cantidad || 0)
      const unitario = formatCurrency(item.precioUnitario || 0)
      const subtotal = formatCurrency(item.subtotal || 0)
      return `
        <div class="item">
          <div class="item-name">${item.descripcion || 'Concepto'}</div>
          <div class="row"><span class="muted">${cantidad} x ${unitario}</span><span class="num">${subtotal}</span></div>
        </div>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Tirilla ${factura?.numero || ''}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body {
            font-family: "Courier New", monospace;
            width: 72mm;
            margin: 0 auto;
            color: #111827;
            font-size: 12px;
            line-height: 1.45;
          }
          .center { text-align: center; }
          .muted { color: #4b5563; }
          .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
          .clinic-name {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .doc-number { font-size: 13px; font-weight: 700; letter-spacing: 1px; }
          .section { margin-top: 10px; }
          .divider { border-top: 1px dashed #94a3b8; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .row span:last-child { text-align: right; }
          .item { margin-bottom: 7px; }
          .item-name { font-weight: 700; }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-top: 2px solid #111827;
            margin-top: 8px;
            padding-top: 6px;
            font-weight: 700;
          }
          .total-row .amount { font-size: 16px; }
          .stamp {
            border: 2px solid #111827;
            text-align: center;
            font-weight: 700;
            letter-spacing: 4px;
            padding: 4px 0;
            margin: 10px 0;
          }
          .footer { margin-top: 14px; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="clinic-name">${nombreClinica}</div>
          ${identificacion ? `<div class="muted">${identificacion}</div>` : ''}
          ${ubicacion ? `<div class="muted">${ubicacion}</div>` : ''}
        </div>
        <div class="divider"></div>
        ${anulada ? '<div class="stamp">ANULADA</div>' : ''}
        <div class="center doc-number">FACTURA ${factura?.numero || '-'}</div>
        <div class="section">
          <div class="row"><span class="muted">Fecha</span><span>${formatDateTime(factura?.createdAt || factura?.fecha)}</span></div>
          <div class="row"><span class="muted">Cliente</span><span>${factura?.propietario?.nombre || 'Consumidor final'}</span></div>
          <div class="row"><span class="muted">Pago</span><span>${PAYMENT_METHOD_LABELS[factura?.metodoPago] || factura?.metodoPago || '-'}</span></div>
          <div class="row"><span class="muted">Atendio</span><span>${factura?.usuario?.nombre || '-'}</span></div>
        </div>
        <div class="divider"></div>
        <div class="section">
          ${lineas || '<div class="muted">Sin items registrados.</div>'}
        </div>
        <div class="section">
          <div class="row"><span class="muted">Subtotal</span><span class="num">${formatCurrency(factura?.subtotal || 0)}</span></div>
          ${descuento > 0 ? `<div class="row"><span class="muted">Descuento</span><span class="num">-${formatCurrency(descuento)}</span></div>` : ''}
          <div class="total-row"><span>TOTAL</span><span class="amount num">${formatCurrency(factura?.total || 0)}</span></div>
        </div>
        ${factura?.estadoElectronico === 'validada' && factura?.cufe
          ? `<div class="section"><div class="muted" style="word-break: break-all; font-size: 10px;">CUFE: ${factura.cufe}</div></div>`
          : ''}
        <div class="footer">
          <div>Gracias por confiar en nosotros</div>
          <div class="muted">${nombreClinica} · Bourgelat</div>
        </div>
      </body>
    </html>
  `
}

/**
 * Imprime la tirilla en un iframe oculto para no sacar al cajero de la pantalla
 * donde está: el POS sigue abierto detrás del diálogo de impresión.
 */
export const imprimirTirilla = ({ factura, clinica }) => {
  if (!factura) {
    toast.error('No hay factura para imprimir.')
    return
  }

  const html = buildThermalReceiptHtml({ factura, clinica })
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    toast.error('No se pudo preparar la tirilla para impresion.')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  setTimeout(() => document.body.removeChild(iframe), 1000)
}
