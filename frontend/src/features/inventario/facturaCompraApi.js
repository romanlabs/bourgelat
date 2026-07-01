import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  )

export const obtenerFacturasCompra = ({ estado, proveedor, pagina, limite } = {}) =>
  api.get('/facturas-compra', { params: cleanParams({ estado, proveedor, pagina, limite }) }).then((r) => r.data)

export const obtenerFacturaCompra = (id) =>
  api.get(`/facturas-compra/${id}`).then((r) => r.data)

export const crearFacturaCompra = (datos) =>
  api.post('/facturas-compra', datos).then((r) => r.data)

export const editarFacturaCompra = (id, datos) =>
  api.put(`/facturas-compra/${id}`, datos).then((r) => r.data)

export const confirmarFacturaCompra = (id) =>
  api.post(`/facturas-compra/${id}/confirmar`).then((r) => r.data)

export const anularFacturaCompra = (id) =>
  api.post(`/facturas-compra/${id}/anular`).then((r) => r.data)

export const marcarComoPagada = (id, fechaPago) =>
  api.post(`/facturas-compra/${id}/pagar`, { fechaPago }).then((r) => r.data)

export const obtenerAlertasCompra = () =>
  api.get('/facturas-compra/alertas').then((r) => r.data)
