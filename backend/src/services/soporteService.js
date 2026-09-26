// Operaciones del modulo de soporte.
//
// Es la unica puerta a los modelos de tickets. La app de la clinica
// (controllers/soporteController.js), el script del equipo
// (scripts/soporte.js) y, a futuro, el panel web de soporte llaman a estas
// funciones con su propio actor (ver soporteReglas.js). Ninguno escribe los
// modelos directamente: estados, eventos del hilo, correos y auditoria son
// identicos sin importar por donde entre la accion.

const { Op } = require('sequelize')
const sequelize = require('../config/database')
const TicketSoporte = require('../models/TicketSoporte')
const MensajeTicketSoporte = require('../models/MensajeTicketSoporte')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { enviarEmail, escaparHtml } = require('./emailService')
const { parsePaginacion } = require('../utils/paginacion')
const logger = require('../utils/logger')
const reglas = require('./soporteReglas')

class ErrorSoporte extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.name = 'ErrorSoporte'
    this.codigo = codigo
  }
}

const MAX_NOMBRE_AUTOR = 120

const noEncontrado = () => new ErrorSoporte('NO_ENCONTRADO', 'Ticket no encontrado')

const transicionInvalida = (desde, hacia) =>
  new ErrorSoporte(
    'TRANSICION_INVALIDA',
    `No se puede pasar el ticket de "${reglas.ETIQUETAS_ESTADO[desde]}" a "${reglas.ETIQUETAS_ESTADO[hacia]}"`
  )

const recortarNombre = (nombre) => String(nombre || 'Usuario').slice(0, MAX_NOMBRE_AUTOR)

// ── Lectura ────────────────────────────────────────────────────────────────

const includesTicket = (actor, { conMensajes = false } = {}) => {
  const includes = [
    {
      model: Usuario,
      as: 'creadoPor',
      // El equipo necesita el correo para contactar a quien reporto; la
      // clinica ya conoce a su gente.
      attributes: reglas.esSoporte(actor) ? ['id', 'nombre', 'email', 'rol'] : ['id', 'nombre'],
      required: false,
    },
  ]

  if (reglas.esSoporte(actor)) {
    includes.push({
      model: Clinica,
      attributes: ['id', 'nombre', 'nombreComercial'],
      required: false,
    })
  }

  if (conMensajes) {
    includes.push({
      model: MensajeTicketSoporte,
      as: 'mensajes',
      attributes: ['id', 'autorTipo', 'autorId', 'autorNombre', 'mensaje', 'createdAt'],
      required: false,
    })
  }

  return includes
}

const serializarTicket = (ticket) => {
  const { Clinica: clinica, ...plano } = ticket.get({ plain: true })

  return {
    ...plano,
    codigo: reglas.formatearCodigoTicket(plano.numero),
    ...(clinica
      ? { clinica: { id: clinica.id, nombre: clinica.nombreComercial || clinica.nombre } }
      : {}),
  }
}

/** Busca el ticket aplicando la visibilidad del actor; 404 si no lo puede ver. */
const buscarTicketVisible = async (actor, referencia, { transaction, conMensajes = false } = {}) => {
  const referenciaParseada = reglas.parsearReferenciaTicket(referencia)
  if (!referenciaParseada) {
    throw noEncontrado()
  }

  const ticket = await TicketSoporte.findOne({
    where: { ...reglas.whereVisibilidad(actor), ...referenciaParseada },
    include: includesTicket(actor, { conMensajes }),
    order: conMensajes
      ? [[{ model: MensajeTicketSoporte, as: 'mensajes' }, 'createdAt', 'ASC']]
      : undefined,
    transaction,
    ...reglas.opcionesTenant(actor),
  })

  if (!ticket || !reglas.puedeVerTicket(actor, ticket)) {
    throw noEncontrado()
  }

  return ticket
}

/**
 * Lista los tickets visibles para el actor, del mas reciente en actividad al
 * mas antiguo. `estado` acepta un estado puntual o `activos` (todo menos
 * cerrados). `clinicaId` solo aplica al equipo de soporte.
 */
const listarTickets = async (actor, filtros = {}) => {
  const { pagina, limite, offset } = parsePaginacion(filtros, {
    limitePorDefecto: 20,
    limiteMaximo: 50,
  })

  const where = { ...reglas.whereVisibilidad(actor) }

  if (filtros.estado === 'activos') {
    where.estado = { [Op.ne]: 'cerrado' }
  } else if (reglas.ESTADOS.includes(filtros.estado)) {
    where.estado = filtros.estado
  }

  if (reglas.esSoporte(actor) && filtros.clinicaId) {
    where.clinicaId = filtros.clinicaId
  }

  const { rows, count } = await TicketSoporte.findAndCountAll({
    where,
    include: includesTicket(actor),
    order: [['ultimaActividadAt', 'DESC']],
    limit: limite,
    offset,
    distinct: true,
    ...reglas.opcionesTenant(actor),
  })

  return {
    tickets: rows.map(serializarTicket),
    total: count,
    pagina,
    paginas: Math.max(1, Math.ceil(count / limite)),
  }
}

const obtenerTicket = async (actor, referencia) =>
  serializarTicket(await buscarTicketVisible(actor, referencia, { conMensajes: true }))

// ── Escritura ──────────────────────────────────────────────────────────────

const camposTrasCambio = (ticket, actor, estadoNuevo, ahora) => ({
  estado: estadoNuevo,
  ultimaActividadAt: ahora,
  resueltoAt: reglas.calcularResueltoAt(estadoNuevo, ticket.resueltoAt, ahora),
  ...(reglas.esSoporte(actor) ? { asignadoA: actor.nombre } : {}),
})

// Los cambios de estado quedan en el hilo como evento: la clinica (y el panel
// futuro) ven el historial completo sin consultar la auditoria.
const registrarEventoEstado = ({ ticket, actor, estadoNuevo, fecha, transaction }) =>
  MensajeTicketSoporte.create(
    {
      ticketId: ticket.id,
      clinicaId: ticket.clinicaId,
      autorTipo: 'sistema',
      autorId: actor.id || null,
      autorNombre: recortarNombre(reglas.nombreVisibleActor(actor)),
      mensaje: `${reglas.nombreVisibleActor(actor)} cambió el estado a "${reglas.ETIQUETAS_ESTADO[estadoNuevo]}"`,
      createdAt: fecha,
    },
    { transaction }
  )

const auditar = (actor, ticket, { accion, descripcion, datosNuevos, datosAnteriores = null }) =>
  registrarAuditoria({
    accion,
    entidad: 'TicketSoporte',
    entidadId: ticket.id,
    descripcion,
    datosAnteriores,
    datosNuevos,
    // El log queda en la clinica del ticket aunque actue el equipo de
    // Bourgelat, para que el admin de la clinica lo vea en su Auditoria.
    clinicaId: ticket.clinicaId,
    usuarioId: actor.id || null,
    ip: actor.ip ?? null,
    userAgent: actor.userAgent ?? null,
  })

const crearTicket = async (actor, datos, { capturaUrl = null } = {}) => {
  if (actor?.tipo !== 'usuario') {
    throw new ErrorSoporte('NO_PERMITIDO', 'Solo una clínica puede abrir tickets de soporte')
  }

  // El asunto viaja en la cabecera del correo al equipo: sin saltos de linea.
  const asunto = String(datos.asunto ?? '').replace(/\s+/g, ' ').trim()
  const descripcion = String(datos.descripcion ?? '').trim()

  if (!asunto || !descripcion) {
    throw new ErrorSoporte('DATOS_INVALIDOS', 'El asunto y la descripción son obligatorios')
  }

  if (!reglas.CATEGORIAS.includes(datos.categoria) || !reglas.PRIORIDADES.includes(datos.prioridad)) {
    throw new ErrorSoporte('DATOS_INVALIDOS', 'Categoría o prioridad no válida')
  }

  const ahora = new Date()

  const creado = await sequelize.transaction(async (transaction) => {
    const ticket = await TicketSoporte.create(
      {
        clinicaId: actor.clinicaId,
        creadoPorId: actor.id,
        asunto,
        categoria: datos.categoria,
        prioridad: datos.prioridad,
        estado: 'abierto',
        modulo: datos.modulo ? String(datos.modulo).slice(0, 120) : null,
        contexto: reglas.sanitizarContexto(datos.contexto),
        capturaUrl,
        ultimaActividadAt: ahora,
      },
      { transaction }
    )

    await MensajeTicketSoporte.create(
      {
        ticketId: ticket.id,
        clinicaId: actor.clinicaId,
        autorTipo: 'usuario',
        autorId: actor.id,
        autorNombre: recortarNombre(actor.nombre),
        mensaje: descripcion,
        createdAt: ahora,
      },
      { transaction }
    )

    return ticket
  })

  const ticket = await buscarTicketVisible(actor, creado.id, { conMensajes: true })
  const codigo = reglas.formatearCodigoTicket(ticket.numero)

  await auditar(actor, ticket, {
    accion: 'CREAR_TICKET_SOPORTE',
    descripcion: `Ticket de soporte ${codigo} abierto: ${asunto}`,
    datosNuevos: { codigo, asunto, categoria: ticket.categoria, prioridad: ticket.prioridad, modulo: ticket.modulo },
  })

  await notificarSinFallar(`aviso del ticket nuevo ${codigo}`, () =>
    avisarAlEquipo({ ticket, actor, mensaje: descripcion, esNuevo: true })
  )

  return serializarTicket(ticket)
}

/**
 * Agrega un mensaje al hilo. Sirve igual para la clinica y para el equipo: el
 * actor decide el estado resultante y a quien se notifica. `estado` explicito
 * solo lo usa el equipo (p. ej. responder y dar por resuelto de una vez).
 */
const agregarMensaje = async (actor, referencia, texto, { estado: estadoSolicitado } = {}) => {
  const contenido = String(texto ?? '').trim()

  if (!contenido) {
    throw new ErrorSoporte('DATOS_INVALIDOS', 'El mensaje no puede estar vacío')
  }

  if (estadoSolicitado && !reglas.ESTADOS.includes(estadoSolicitado)) {
    throw new ErrorSoporte('DATOS_INVALIDOS', 'Estado no válido')
  }

  const cambio = await sequelize.transaction(async (transaction) => {
    const ticket = await buscarTicketVisible(actor, referencia, { transaction })

    if (!reglas.puedeRecibirMensajes(ticket.estado)) {
      throw new ErrorSoporte('TICKET_CERRADO', 'El ticket está cerrado y ya no admite mensajes')
    }

    const estadoAnterior = ticket.estado
    const cambioExplicito = Boolean(estadoSolicitado) && estadoSolicitado !== estadoAnterior

    if (cambioExplicito && !reglas.validarTransicion(estadoAnterior, estadoSolicitado, actor)) {
      throw transicionInvalida(estadoAnterior, estadoSolicitado)
    }

    const estadoNuevo = estadoSolicitado || reglas.estadoTrasMensaje(estadoAnterior, actor)
    const ahora = new Date()

    await MensajeTicketSoporte.create(
      {
        ticketId: ticket.id,
        clinicaId: ticket.clinicaId,
        autorTipo: actor.tipo,
        autorId: actor.id || null,
        autorNombre: recortarNombre(actor.nombre),
        mensaje: contenido,
        createdAt: ahora,
      },
      { transaction }
    )

    if (cambioExplicito) {
      // Un milisegundo despues para que el evento aparezca bajo el mensaje.
      await registrarEventoEstado({
        ticket,
        actor,
        estadoNuevo,
        fecha: new Date(ahora.getTime() + 1),
        transaction,
      })
    }

    await ticket.update(camposTrasCambio(ticket, actor, estadoNuevo, ahora), { transaction })

    return { ticketId: ticket.id, estadoAnterior, estadoNuevo }
  })

  const ticket = await buscarTicketVisible(actor, cambio.ticketId, { conMensajes: true })
  const codigo = reglas.formatearCodigoTicket(ticket.numero)

  await auditar(actor, ticket, {
    accion: 'RESPONDER_TICKET_SOPORTE',
    descripcion: `${reglas.nombreVisibleActor(actor)} respondió el ticket de soporte ${codigo}`,
    datosAnteriores: { estado: cambio.estadoAnterior },
    datosNuevos: { estado: cambio.estadoNuevo },
  })

  await notificarSinFallar(`aviso de respuesta en ${codigo}`, () =>
    reglas.esSoporte(actor)
      ? avisarAlCreador({ ticket, actor, mensaje: contenido })
      : avisarAlEquipo({ ticket, actor, mensaje: contenido, esNuevo: false })
  )

  return serializarTicket(ticket)
}

const cambiarEstado = async (actor, referencia, estadoNuevo) => {
  if (!reglas.ESTADOS.includes(estadoNuevo)) {
    throw new ErrorSoporte('DATOS_INVALIDOS', 'Estado no válido')
  }

  const cambio = await sequelize.transaction(async (transaction) => {
    const ticket = await buscarTicketVisible(actor, referencia, { transaction })
    const estadoAnterior = ticket.estado

    if (estadoAnterior === estadoNuevo) {
      throw new ErrorSoporte(
        'TRANSICION_INVALIDA',
        `El ticket ya está en estado "${reglas.ETIQUETAS_ESTADO[estadoNuevo]}"`
      )
    }

    if (!reglas.validarTransicion(estadoAnterior, estadoNuevo, actor)) {
      throw transicionInvalida(estadoAnterior, estadoNuevo)
    }

    const ahora = new Date()
    await registrarEventoEstado({ ticket, actor, estadoNuevo, fecha: ahora, transaction })
    await ticket.update(camposTrasCambio(ticket, actor, estadoNuevo, ahora), { transaction })

    return { ticketId: ticket.id, estadoAnterior }
  })

  const ticket = await buscarTicketVisible(actor, cambio.ticketId, { conMensajes: true })
  const codigo = reglas.formatearCodigoTicket(ticket.numero)

  await auditar(actor, ticket, {
    accion: 'CAMBIAR_ESTADO_TICKET_SOPORTE',
    descripcion: `${reglas.nombreVisibleActor(actor)} cambió el ticket de soporte ${codigo} de "${reglas.ETIQUETAS_ESTADO[cambio.estadoAnterior]}" a "${reglas.ETIQUETAS_ESTADO[estadoNuevo]}"`,
    datosAnteriores: { estado: cambio.estadoAnterior },
    datosNuevos: { estado: estadoNuevo },
  })

  if (reglas.esSoporte(actor)) {
    await notificarSinFallar(`aviso de cambio de estado en ${codigo}`, () =>
      avisarAlCreador({ ticket, actor, estadoNuevo })
    )
  }

  return serializarTicket(ticket)
}

// ── Notificaciones ─────────────────────────────────────────────────────────

const destinoEquipo = () => String(process.env.SOPORTE_EMAIL || '').trim()

const urlFrontend = () =>
  String(process.env.FRONTEND_URL || String(process.env.FRONTEND_URLS || '').split(',')[0] || 'http://localhost:5173')
    .trim()
    .replace(/\/$/, '')

// Un correo que falla nunca debe deshacer un ticket ya guardado.
const notificarSinFallar = async (descripcion, enviar) => {
  try {
    await enviar()
  } catch (error) {
    logger.warn({ contexto: 'soporte', mensaje: `No se pudo enviar ${descripcion}: ${error.message}` })
  }
}

const textoAHtml = (texto) => escaparHtml(texto).replace(/\n/g, '<br>')

const plantillaCorreo = (tituloHtml, cuerpoHtml) => `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #112739;">
      <h2 style="color: #112739;">${tituloHtml}</h2>
      ${cuerpoHtml}
    </div>
  `

const bloqueMensajeHtml = (mensaje) =>
  `<div style="background: #f4f7fb; border-radius: 6px; padding: 12px 16px; line-height: 1.5;">${textoAHtml(mensaje)}</div>`

const avisarAlEquipo = async ({ ticket, actor, mensaje, esNuevo }) => {
  const para = destinoEquipo()
  const codigo = reglas.formatearCodigoTicket(ticket.numero)

  if (!para) {
    logger.warn({
      contexto: 'soporte',
      mensaje: `SOPORTE_EMAIL no está configurado; el aviso del ticket ${codigo} no se envió`,
    })
    return
  }

  const clinica = await Clinica.findByPk(ticket.clinicaId, { attributes: ['nombre', 'nombreComercial'] })
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Clínica sin nombre'
  const comandoVer = `npm run soporte:ver -- --ticket ${ticket.numero}`

  const detalles = [
    ['Clínica', nombreClinica],
    ['Reporta', `${actor.nombre}${actor.email ? ` <${actor.email}>` : ''} (${(actor.roles || []).join(', ')})`],
    ['Categoría', reglas.ETIQUETAS_CATEGORIA[ticket.categoria]],
    ['Prioridad', reglas.ETIQUETAS_PRIORIDAD[ticket.prioridad]],
    ['Estado', reglas.ETIQUETAS_ESTADO[ticket.estado]],
    ['Módulo', ticket.modulo || 'No indicado'],
  ]

  const titulo = esNuevo
    ? `Nuevo ticket ${codigo}: ${ticket.asunto}`
    : `Nueva respuesta en ${codigo}: ${ticket.asunto}`

  const asunto = esNuevo
    ? `[${codigo}] ${ticket.asunto} — ${nombreClinica}`
    : `[${codigo}] Nueva respuesta de ${nombreClinica}`

  const texto = [
    titulo,
    '',
    ...detalles.map(([clave, valor]) => `${clave}: ${valor}`),
    ...(ticket.capturaUrl ? [`Captura: ${ticket.capturaUrl}`] : []),
    '',
    'Mensaje:',
    mensaje,
    '',
    `Hilo completo: ${comandoVer}`,
  ].join('\n')

  const filasHtml = detalles
    .map(
      ([clave, valor]) =>
        `<tr><td style="padding: 4px 12px 4px 0; color: #51697d; white-space: nowrap;">${escaparHtml(clave)}</td><td style="padding: 4px 0;">${escaparHtml(valor)}</td></tr>`
    )
    .join('')

  const html = plantillaCorreo(
    escaparHtml(titulo),
    `
      <table style="border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">${filasHtml}</table>
      ${ticket.capturaUrl ? `<p><a href="${escaparHtml(ticket.capturaUrl)}" style="color: #10b981;">Ver captura de pantalla</a></p>` : ''}
      <p style="margin-bottom: 6px;"><strong>Mensaje</strong></p>
      ${bloqueMensajeHtml(mensaje)}
      <p style="font-size: 13px; color: #51697d; margin-top: 20px;">Hilo completo desde el servidor: <code>${escaparHtml(comandoVer)}</code></p>
    `
  )

  await enviarEmail({ para, asunto, html, texto })
}

const avisarAlCreador = async ({ ticket, actor, mensaje = null, estadoNuevo = null }) => {
  if (!ticket.creadoPorId) return

  const creador = await Usuario.findOne({
    where: { id: ticket.creadoPorId, clinicaId: ticket.clinicaId },
    attributes: ['id', 'nombre', 'email', 'activo'],
  })

  if (!creador?.email || !creador.activo) return

  const codigo = reglas.formatearCodigoTicket(ticket.numero)
  const enlace = `${urlFrontend()}/soporte?ticket=${ticket.id}`
  const firma = reglas.nombreVisibleActor(actor)
  const estadoTexto = reglas.ETIQUETAS_ESTADO[estadoNuevo || ticket.estado]

  const asunto = mensaje
    ? `[${codigo}] Te respondimos: ${ticket.asunto}`
    : `[${codigo}] Tu ticket ahora está: ${estadoTexto}`

  const intro = mensaje
    ? `${firma} respondió tu ticket ${codigo} (“${ticket.asunto}”).`
    : `${firma} cambió el estado de tu ticket ${codigo} (“${ticket.asunto}”) a “${estadoTexto}”.`

  const texto = [
    `Hola ${creador.nombre},`,
    '',
    intro,
    ...(mensaje ? ['', mensaje] : []),
    '',
    `Estado actual: ${estadoTexto}`,
    `Puedes verlo y responder en: ${enlace}`,
    '',
    'Este correo no recibe respuestas; contesta desde la sección Soporte de Bourgelat.',
  ].join('\n')

  const html = plantillaCorreo(
    escaparHtml(mensaje ? 'Respondimos tu ticket' : 'Tu ticket cambió de estado'),
    `
      <p>Hola ${escaparHtml(creador.nombre)},</p>
      <p>${escaparHtml(intro)}</p>
      ${mensaje ? bloqueMensajeHtml(mensaje) : ''}
      <p style="margin-top: 16px;">Estado actual: <strong>${escaparHtml(estadoTexto)}</strong></p>
      <p style="margin: 24px 0;">
        <a href="${escaparHtml(enlace)}"
           style="background: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Ver el ticket
        </a>
      </p>
      <p style="font-size: 13px; color: #51697d;">Este correo no recibe respuestas; contesta desde la sección Soporte de Bourgelat.</p>
    `
  )

  await enviarEmail({ para: creador.email, asunto, html, texto })
}

module.exports = {
  ErrorSoporte,
  listarTickets,
  obtenerTicket,
  crearTicket,
  agregarMensaje,
  cambiarEstado,
}
