import { estadoVencimiento, fechaCortaVencimiento, hoyLocal } from '@/features/inventario/inventarioUtils'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import { pedirResaltado } from '@/lib/useResaltado'

// Fase A de la campanita: los avisos no se guardan en el servidor, se derivan
// de lo que la app ya consulta (citas de hoy, inventario, compras, fiado,
// soporte y plan). Cada aviso tiene un id estable que cambia cuando cambia su
// estado (bajo el mínimo → agotado), así vuelve a salir como nuevo.

// Cuántos casos de un mismo tipo se nombran antes de resumir el resto.
const MAX_POR_TIPO = 4
// Minutos en sala a partir de los cuales se avisa a recepción y al veterinario.
const MINUTOS_ESPERA = 15
// Minutos de retraso desde la hora de la cita para avisar que no ha llegado.
const MINUTOS_SIN_LLEGAR = 15

// Avisos guardados que no pueden esperar: mientras estén sin leer salen
// arriba, en «Para revisar ahora». Mismos tipos que TIPOS_URGENTES del backend.
export const TIPOS_URGENTES = ['turno_descuadre', 'turno_sin_cerrar']

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
      // Recepción abre la cita en la sala de espera y la resalta.
      to: `/agenda?tab=recepcion&cita=${cita.id}`,
    }))

  // Citas programadas de hoy que pasaron su hora y nadie marcó la llegada:
  // recepción llama al tutor o la marca como no asistió.
  const sinLlegar = citas
    .filter((cita) => cita.estado === 'programada' && cita.origen !== 'walk_in' && cita.horaInicio)
    .map((cita) => {
      const [h, m] = String(cita.horaInicio).split(':').map(Number)
      return { cita, minutos: minutosAhora - (h * 60 + m) }
    })
    .filter(({ minutos }) => minutos >= MINUTOS_SIN_LLEGAR)
    .sort((a, b) => b.minutos - a.minutos)
    .map(({ cita, minutos }) => ({
      id: `sin-llegar-${cita.id}`,
      categoria: 'clinica',
      titulo: `${cita.mascota?.nombre || 'Un paciente'} no ha llegado`,
      texto: `Su cita era a las ${hora12(cita.horaInicio)} (hace ${duracion(minutos)})${cita.veterinario?.nombre ? ` con ${cita.veterinario.nombre}` : ''}. Llama al tutor o márcala como no asistió.`,
      to: `/agenda?tab=recepcion&cita=${cita.id}`,
    }))

  return [...espera, ...sinLlegar, ...historias]
}

const QUE_TOCA = {
  vacuna: (pendiente) => `la vacuna ${pendiente.nombre}`,
  desparasitacion: (pendiente) => `la desparasitación (${pendiente.nombre})`,
  control: () => 'el control',
}

// «A Lupe se le pasó la vacuna Rabia (20 oct)», «A Lupe le toca hoy el
// control», «A Lupe le toca la vacuna Rabia el 3 nov».
const tituloSeguimiento = (mascota, pendiente, hoy) => {
  const que = QUE_TOCA[pendiente.tipo](pendiente)
  if (pendiente.fecha < hoy) return `A ${mascota} se le pasó ${que} (${fechaCortaVencimiento(pendiente.fecha)})`
  if (pendiente.fecha === hoy) return `A ${mascota} le toca hoy ${que}`
  return `A ${mascota} le toca ${que} el ${fechaCortaVencimiento(pendiente.fecha)}`
}

// Vacunas, desparasitaciones y controles que vencen sin cita agendada: lo que
// recepción debería llamar. El id cambia con lo pendiente, así un nuevo
// vencimiento vuelve a salir como nuevo.
function avisosDeSeguimientos(seguimientos, { hoy }) {
  const avisos = (seguimientos || []).map((paciente) => {
    const [primero, ...resto] = paciente.pendientes
    const tutor = [paciente.propietarioNombre, paciente.propietarioTelefono].filter(Boolean).join(' · ')
    return {
      id: `seguimiento-${paciente.mascotaId}-${paciente.pendientes.map((p) => `${p.tipo}.${p.fecha}`).join('-')}`,
      categoria: 'clinica',
      titulo: tituloSeguimiento(paciente.mascotaNombre, primero, hoy),
      texto: [
        tutor ? `Tutor: ${tutor}.` : null,
        resto.length ? `También ${resto.map((p) => QUE_TOCA[p.tipo](p)).join(', ')}.` : null,
        'Sin cita agendada.',
      ].filter(Boolean).join(' '),
      to: `/pacientes/${paciente.mascotaId}/historial`,
    }
  })
  return conResumen(avisos, (resto) => ({
    id: `seguimiento-resumen-${avisos.length}`,
    categoria: 'clinica',
    titulo: resto === 1 ? '1 paciente más con vacuna o control pendiente' : `${formatNumber(resto)} pacientes más con vacuna o control pendiente`,
    texto: 'Revísalos en Antecedentes.',
    to: '/antecedentes',
  }))
}

// Facturas que la DIAN rechazó o no se pudieron enviar este mes.
function avisoDian(resumenElectronico) {
  const errores = Number(resumenElectronico?.rechazada || 0) + Number(resumenElectronico?.error || 0)
  if (errores <= 0) return []
  return [{
    id: `dian-${errores}`,
    categoria: 'caja',
    titulo: errores === 1 ? '1 factura no llegó a la DIAN' : `${formatNumber(errores)} facturas no llegaron a la DIAN`,
    texto: 'Fueron rechazadas o no se pudieron enviar. Revísalas antes del siguiente corte.',
    to: '/finanzas',
  }]
}

function avisosDeInventario(inventario, { hoy }) {
  const articulos = [
    ...(inventario?.productos || []).map((item) => ({ ...item, tipo: 'producto' })),
    ...(inventario?.insumos || []).map((item) => ({ ...item, tipo: 'insumo' })),
  ]
  // Inventario abre el de ventas o el clínico y resalta el artículo: en la
  // lista bajo el mínimo si es por stock, o buscándolo por nombre si es por
  // vencimiento (puede no estar bajo el mínimo).
  const destino = (item, { porStock }) => ({
    to: '/inventario',
    state: pedirResaltado(item.tipo, item.id, {
      inventario: item.tipo === 'producto' ? 'ventas' : 'clinica',
      ...(porStock ? { verBajoMinimo: true } : { buscar: item.nombre }),
    }),
  })

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
        ...destino(item, { porStock: true }),
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
      ...destino(item, { porStock: false }),
    }))

  return [
    ...conResumen(stock, (resto) => ({
      id: `stock-resumen-${stock.length}`,
      categoria: 'inventario',
      titulo: resto === 1 ? '1 artículo más bajo el mínimo' : `${formatNumber(resto)} artículos más bajo el mínimo`,
      texto: 'Revísalos en Inventario.',
      to: '/inventario',
      state: { verBajoMinimo: true },
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
    state: pedirResaltado('compra', factura.id, { tab: 'facturas-compra' }),
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
        state: pedirResaltado('cliente', cliente.propietarioId || 'mostrador', { tab: 'cobrar' }),
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
  seguimientos,
  resumenElectronico,
  puedeAtender = false,
  ahora = new Date(),
} = {}) {
  const hoy = hoyLocal(ahora)
  return [
    ...avisosDeCitas(citas || [], { ahora, puedeAtender }),
    ...avisosDeSeguimientos(seguimientos, { hoy }),
    ...avisosDeInventario(inventario, { hoy }),
    ...avisosDeFiado(cuentasPorCobrar, { hoy }),
    ...avisosDeCompras(alertasCompra),
    ...avisoDian(resumenElectronico),
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

// Qué se resalta al abrir un aviso guardado, según la entidad que lo originó.
// Las citas van en el enlace (Recepción la abre con ?cita=).
const RESALTAR_ENTIDAD = {
  ExamenLaboratorio: (id) => pedirResaltado('examen', id),
  CajaTurno: (id) => pedirResaltado('turno', id, { tab: 'turnos' }),
}

/** Convierte una fila del servidor al mismo formato de los avisos derivados. */
export const desdeServidor = (fila, ahora = new Date()) => ({
  id: `srv-${fila.id}`,
  servidorId: fila.id,
  categoria: fila.categoria,
  tipo: fila.tipo,
  urgente: TIPOS_URGENTES.includes(fila.tipo),
  titulo: fila.titulo,
  texto: fila.texto,
  to: fila.enlace || null,
  state: fila.entidadId ? RESALTAR_ENTIDAD[fila.entidadTipo]?.(fila.entidadId) : undefined,
  fecha: fila.createdAt,
  cuando: cuandoFue(fila.createdAt, ahora),
  nueva: !fila.leidaEn,
})

/**
 * Grupos del panel: primero lo pendiente ahora (derivado, sin fecha, y lo
 * urgente sin leer) y luego lo guardado por día: Hoy, Ayer y la fecha.
 */
export function agruparAvisos(avisos, ahora = new Date()) {
  const hoy = hoyLocal(ahora)
  const ayer = hoyLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1))
  const grupos = []
  const esPendiente = (aviso) => !aviso.fecha || (aviso.urgente && aviso.nueva)
  const pendientes = [...avisos.filter((aviso) => aviso.urgente && aviso.nueva), ...avisos.filter((aviso) => !aviso.fecha)]
  if (pendientes.length > 0) grupos.push({ id: 'pendiente', titulo: 'Para revisar ahora', items: pendientes })

  for (const aviso of avisos.filter((item) => !esPendiente(item))) {
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
