import { estadoVencimiento, fechaCortaVencimiento, hoyLocal } from '@/features/inventario/inventarioUtils'
import { formatNumber } from '@/features/dashboard/dashboardUtils'

// Fase A de la campanita: los avisos no se guardan en el servidor, se derivan
// de lo que la app ya consulta (citas de hoy, inventario, compras, fiado,
// soporte y plan). Cada aviso tiene un id estable que cambia cuando cambia su
// estado (bajo el mínimo → agotado), así vuelve a salir como nuevo.

// Cuántos casos de un mismo tipo se nombran antes de resumir el resto.
const MAX_POR_TIPO = 4
// Minutos en sala a partir de los cuales se avisa a recepción y al veterinario.
const MINUTOS_ESPERA = 15

const hora12 = (hora) => {
  const [h, m] = String(hora || '').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

// «20 minutos», «1 h 5 min»: pasada la hora los minutos sueltos no se leen.
const duracion = (minutos) =>
  minutos < 60 ? `${minutos} minutos` : `${Math.floor(minutos / 60)} h${minutos % 60 ? ` ${minutos % 60} min` : ''}`

const pesos =(valor) => `$${formatNumber(Math.round(Number(valor) || 0))}`

// Nombra hasta MAX_POR_TIPO casos y junta el resto en un aviso que los cuenta.
const conResumen = (items, resumen) => {
  if (items.length <= MAX_POR_TIPO) return items
  const resto = items.length - MAX_POR_TIPO
  return [...items.slice(0, MAX_POR_TIPO), resumen(resto)]
}

function avisosDeCitas(citas, { ahora, puedeAtender }) {
  const historias = citas
    .filter((cita) => cita.estado === 'completada' && !cita.historia?.id)
    .map((cita) => ({
      id: `historia-${cita.id}`,
      categoria: 'clinica',
      titulo: `Historia de ${cita.mascota?.nombre || 'un paciente'} sin cerrar`,
      texto: `Consulta de las ${hora12(cita.horaInicio)}${cita.veterinario?.nombre ? ` con ${cita.veterinario.nombre}` : ''}.`,
      // Abre la historia de esa cita, como al terminar la consulta en Agenda.
      to: puedeAtender && cita.mascota?.id
        ? `/pacientes/${cita.mascota.id}/historial?citaId=${cita.id}`
        : '/agenda',
    }))

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const espera = citas
    .filter((cita) => cita.estado === 'en_espera' && cita.horaLlegada)
    .map((cita) => {
      const [h, m] = String(cita.horaLlegada).split(':').map(Number)
      return { cita, minutos: minutosAhora - (h * 60 + m) }
    })
    .filter(({ minutos }) => minutos >= MINUTOS_ESPERA)
    .sort((a, b) => b.minutos - a.minutos)
    .map(({ cita, minutos }) => ({
      id: `espera-${cita.id}`,
      categoria: 'clinica',
      titulo: `${cita.mascota?.nombre || 'Un paciente'} lleva ${duracion(minutos)} en sala`,
      texto: `Llegó a las ${hora12(cita.horaLlegada)}${cita.veterinario?.nombre ? `; lo atiende ${cita.veterinario.nombre}` : ''}.`,
      to: '/agenda',
    }))

  return [...espera, ...historias]
}

function avisosDeInventario(inventario, { hoy }) {
  const articulos = [
    ...(inventario?.productos || []).map((item) => ({ ...item, tipo: 'producto' })),
    ...(inventario?.insumos || []).map((item) => ({ ...item, tipo: 'insumo' })),
  ]
  const destino = (item) =>
    item.tipo === 'producto'
      ? { to: '/inventario', state: { resaltarProductoId: item.id } }
      : { to: '/inventario' }

  const stock = articulos
    .filter((item) => Number(item.stock) <= Number(item.stockMinimo))
    // Primero los agotados: esos ya trabaron una venta o un tratamiento.
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .map((item) => {
      const agotado = Number(item.stock) <= 0
      return {
        id: `stock-${item.tipo}-${item.id}-${agotado ? 'agotado' : 'bajo'}`,
        categoria: 'inventario',
        titulo: agotado ? `Se agotó ${item.nombre}` : `${item.nombre} está bajo el mínimo`,
        texto: agotado
          ? `El mínimo es ${formatNumber(item.stockMinimo)}. Conviene pedirlo pronto.`
          : `Quedan ${formatNumber(item.stock)}, el mínimo es ${formatNumber(item.stockMinimo)}.`,
        ...destino(item),
      }
    })

  const vencimientos = articulos
    .map((item) => ({ item, estado: estadoVencimiento(item, hoy) }))
    .filter(({ estado }) => estado)
    .sort((a, b) => String(a.item.fechaVencimiento).localeCompare(String(b.item.fechaVencimiento)))
    .map(({ item, estado }) => ({
      id: `vence-${item.tipo}-${item.id}-${estado}-${String(item.fechaVencimiento).slice(0, 10)}`,
      categoria: 'inventario',
      titulo: estado === 'vencido'
        ? `${item.nombre} está vencido`
        : `${item.nombre} vence el ${fechaCortaVencimiento(item.fechaVencimiento)}`,
      texto: estado === 'vencido'
        ? `Venció el ${fechaCortaVencimiento(item.fechaVencimiento)} y quedan ${formatNumber(item.stock)}. Retíralo de la venta.`
        : `Quedan ${formatNumber(item.stock)}. Úsalo primero.`,
      ...destino(item),
    }))

  return [
    ...conResumen(stock, (resto) => ({
      id: `stock-resumen-${stock.length}`,
      categoria: 'inventario',
      titulo: resto === 1 ? '1 artículo más bajo el mínimo' : `${formatNumber(resto)} artículos más bajo el mínimo`,
      texto: 'Revísalos en Inventario.',
      to: '/inventario',
    })),
    ...conResumen(vencimientos, (resto) => ({
      id: `vence-resumen-${vencimientos.length}`,
      categoria: 'inventario',
      titulo: resto === 1 ? '1 artículo más vencido o por vencer' : `${formatNumber(resto)} artículos más vencidos o por vencer`,
      texto: 'Revísalos en Inventario.',
      to: '/inventario',
    })),
  ]
}

function avisosDeCompras(alertasCompra) {
  const aviso = (factura, vencida) => ({
    id: `compra-${factura.id}-${vencida ? 'vencida' : 'proxima'}`,
    categoria: 'caja',
    titulo: vencida
      ? `Pago vencido a ${factura.proveedor || 'un proveedor'}`
      : `Se acerca el pago a ${factura.proveedor || 'un proveedor'}`,
    texto: `Factura ${factura.numero || 'sin número'} por ${pesos(factura.total)}, vence el ${fechaCortaVencimiento(factura.fechaPagoFinal)}.`,
    to: '/inventario',
  })
  return [
    ...(alertasCompra?.vencidas?.facturas || []).map((factura) => aviso(factura, true)),
    ...(alertasCompra?.proximasAVencer?.facturas || []).map((factura) => aviso(factura, false)),
  ]
}

function avisosDeFiado(cuentas, { hoy }) {
  const clientes = (cuentas?.clientes || [])
    .map((cliente) => ({
      cliente,
      vencidas: (cliente.facturas || []).filter(
        (factura) => factura.fechaVencimientoCredito && String(factura.fechaVencimientoCredito).slice(0, 10) < hoy
      ),
    }))
    .filter(({ vencidas }) => vencidas.length > 0)
    .map(({ cliente, vencidas }) => {
      const saldo = vencidas.reduce((suma, factura) => suma + Number(factura.saldoPendiente || 0), 0)
      return {
        id: `fiado-${cliente.propietarioId || 'mostrador'}-${vencidas.map((f) => f.id).join('.')}`,
        categoria: 'caja',
        titulo: `Crédito vencido de ${cliente.nombre}`,
        texto: `${vencidas.length === 1 ? '1 venta' : `${vencidas.length} ventas`} con saldo de ${pesos(saldo)}.`,
        to: '/caja',
        state: { tab: 'cobrar' },
      }
    })

  return conResumen(clientes, (resto) => ({
    id: `fiado-resumen-${clientes.length}`,
    categoria: 'caja',
    titulo: resto === 1 ? '1 crédito vencido más' : `${formatNumber(resto)} créditos vencidos más`,
    texto: 'Revísalos en Caja, en «Por cobrar».',
    to: '/caja',
    state: { tab: 'cobrar' },
  }))
}

function avisosDeSistema({ tickets, diasRestantes }) {
  const avisos = (tickets || [])
    .filter((ticket) => ticket.estado === 'esperando_usuario')
    .map((ticket) => ({
      // Con la fecha de actividad: una respuesta nueva al mismo ticket vuelve a avisar.
      id: `soporte-${ticket.id}-${ticket.ultimaActividadAt || ''}`,
      categoria: 'sistema',
      titulo: `Respondimos tu solicitud ${ticket.codigo || ''}`.trim(),
      texto: `«${ticket.asunto}». Te toca responder.`,
      to: `/soporte?ticket=${ticket.id}`,
    }))

  if (typeof diasRestantes === 'number' && diasRestantes <= 7) {
    avisos.push({
      id: `plan-${diasRestantes}`,
      categoria: 'sistema',
      titulo: diasRestantes <= 0 ? 'Tu plan venció' : `Tu plan vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`,
      texto: 'Renuévalo para seguir registrando sin interrupciones.',
      to: '/plan',
    })
  }
  return avisos
}

/**
 * Junta los avisos de todas las fuentes. Cada fuente llega `undefined` si el
 * rol no la puede consultar, y entonces no aporta nada.
 */
export function derivarNotificaciones({
  citas,
  inventario,
  alertasCompra,
  cuentasPorCobrar,
  tickets,
  diasRestantes,
  puedeAtender = false,
  ahora = new Date(),
} = {}) {
  const hoy = hoyLocal(ahora)
  return [
    ...avisosDeCitas(citas || [], { ahora, puedeAtender }),
    ...avisosDeInventario(inventario, { hoy }),
    ...avisosDeFiado(cuentasPorCobrar, { hoy }),
    ...avisosDeCompras(alertasCompra),
    ...avisosDeSistema({ tickets, diasRestantes }),
  ]
}

// ── Avisos guardados (Fase B) ─────────────────────────────────────────────

const diaLocal = (fecha) => hoyLocal(new Date(fecha))

// «Hace 5 min», «Hace 2 h» o la hora del día en que pasó.
export const cuandoFue = (fecha, ahora = new Date()) => {
  const minutos = Math.max(0, Math.floor((ahora - new Date(fecha)) / 60_000))
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  if (minutos < 6 * 60 && diaLocal(fecha) === hoyLocal(ahora)) return `Hace ${Math.floor(minutos / 60)} h`
  return new Date(fecha).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
}

/** Convierte una fila del servidor al mismo formato de los avisos derivados. */
export const desdeServidor = (fila, ahora = new Date()) => ({
  id: `srv-${fila.id}`,
  servidorId: fila.id,
  categoria: fila.categoria,
  titulo: fila.titulo,
  texto: fila.texto,
  to: fila.enlace || null,
  fecha: fila.createdAt,
  cuando: cuandoFue(fila.createdAt, ahora),
  nueva: !fila.leidaEn,
})

/**
 * Grupos del panel: primero lo pendiente ahora (derivado, sin fecha) y luego
 * lo guardado por día: Hoy, Ayer y la fecha para lo anterior.
 */
export function agruparAvisos(avisos, ahora = new Date()) {
  const hoy = hoyLocal(ahora)
  const ayer = hoyLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1))
  const grupos = []
  const pendientes = avisos.filter((aviso) => !aviso.fecha)
  if (pendientes.length > 0) grupos.push({ id: 'pendiente', titulo: 'Para revisar ahora', items: pendientes })

  for (const aviso of avisos.filter((item) => item.fecha)) {
    const dia = diaLocal(aviso.fecha)
    const titulo = dia === hoy
      ? 'Hoy'
      : dia === ayer
        ? 'Ayer'
        : new Date(aviso.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    const grupo = grupos.find((item) => item.id === dia)
    if (grupo) grupo.items.push(aviso)
    else grupos.push({ id: dia, titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), items: [aviso] })
  }
  return grupos
}

export const FILTROS = [
  { id: 'todas', label: 'Todas', incluye: () => true },
  { id: 'sinleer', label: 'Sin leer', incluye: (aviso) => aviso.nueva },
  { id: 'clinica', label: 'Clínica', incluye: (aviso) => aviso.categoria === 'clinica' },
  { id: 'caja', label: 'Caja e inventario', incluye: (aviso) => aviso.categoria === 'caja' || aviso.categoria === 'inventario' },
]
