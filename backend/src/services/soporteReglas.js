// Reglas del modulo de soporte, sin base de datos.
//
// Todo el modulo razona sobre un ACTOR explicito, no sobre `req`:
//   - usuario de clinica: { tipo: 'usuario', id, nombre, email, clinicaId, roles }
//   - equipo de Bourgelat: { tipo: 'soporte', id, nombre }
//     (hoy id es null porque responde el script; con el panel web futuro sera
//     la cuenta de soporte, y nada de este archivo cambia)
//
// Asi la app de la clinica, el script del equipo y el futuro panel comparten
// exactamente las mismas reglas. Los tests de soporteReglas.test.js son ese
// contrato.

const ESTADOS = ['abierto', 'en_progreso', 'esperando_usuario', 'resuelto', 'cerrado']
const CATEGORIAS = ['error', 'duda', 'facturacion', 'sugerencia', 'otro']
const PRIORIDADES = ['baja', 'media', 'alta']

// Estas etiquetas llegan a la clinica (correos y eventos del hilo): van con
// tildes. El frontend tiene su espejo en features/soporte/soporteConstants.js.
const ETIQUETAS_ESTADO = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  esperando_usuario: 'Esperando tu respuesta',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

const ETIQUETAS_CATEGORIA = {
  error: 'Algo no funciona',
  duda: 'Duda de uso',
  facturacion: 'Facturación o pagos',
  sugerencia: 'Sugerencia',
  otro: 'Otro',
}

const ETIQUETAS_PRIORIDAD = {
  baja: 'Puedo seguir trabajando',
  media: 'Me retrasa',
  alta: 'No puedo trabajar',
}

// Si la clinica escribe en un ticket que esperaba su respuesta o que ya se
// dio por resuelto, el ticket vuelve a la bandeja del equipo.
const ESTADOS_REABIERTOS_POR_USUARIO = ['esperando_usuario', 'resuelto']
const ESTADOS_FINALES = ['resuelto', 'cerrado']

const TRANSICIONES = {
  // La clinica solo puede cerrar su ticket (ya se soluciono o ya no aplica).
  usuario: {
    abierto: ['cerrado'],
    en_progreso: ['cerrado'],
    esperando_usuario: ['cerrado'],
    resuelto: ['cerrado'],
    cerrado: [],
  },
  // El equipo mueve el ticket a cualquier otro estado, incluso reabrirlo.
  soporte: Object.fromEntries(
    ESTADOS.map((estado) => [estado, ESTADOS.filter((otro) => otro !== estado)])
  ),
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const formatearCodigoTicket = (numero) => `SOP-${String(numero).padStart(5, '0')}`

/**
 * Acepta un UUID, un numero (42) o un codigo (SOP-00042). El script y los
 * correos usan el numero; la API usa el UUID.
 */
const parsearReferenciaTicket = (referencia) => {
  const valor = String(referencia ?? '').trim()

  if (UUID_REGEX.test(valor)) {
    return { id: valor }
  }

  const coincidencia = valor.match(/^(?:SOP-?)?0*(\d+)$/i)
  if (coincidencia) {
    return { numero: Number(coincidencia[1]) }
  }

  return null
}

const esSoporte = (actor) => actor?.tipo === 'soporte'

const esAdminClinica = (actor) =>
  actor?.tipo === 'usuario' && Array.isArray(actor.roles) && actor.roles.includes('admin')

/** El equipo ve todo; el admin, lo de su clinica; el resto, solo lo que creo. */
const puedeVerTicket = (actor, ticket) => {
  if (!actor || !ticket) return false
  if (esSoporte(actor)) return true
  if (actor.tipo !== 'usuario' || !actor.clinicaId) return false
  if (ticket.clinicaId !== actor.clinicaId) return false

  return esAdminClinica(actor) || ticket.creadoPorId === actor.id
}

/** Mismo criterio que puedeVerTicket, expresado como `where` de Sequelize. */
const whereVisibilidad = (actor) => {
  if (esSoporte(actor)) return {}

  if (actor?.tipo !== 'usuario' || !actor.clinicaId) {
    throw new Error('whereVisibilidad: el actor no es del equipo ni pertenece a una clinica')
  }

  return esAdminClinica(actor)
    ? { clinicaId: actor.clinicaId }
    : { clinicaId: actor.clinicaId, creadoPorId: actor.id }
}

// El equipo de Bourgelat opera sobre todas las clinicas por diseno; esas son
// las unicas queries de este modulo que se saltan el tenantGuard.
const opcionesTenant = (actor) => (esSoporte(actor) ? { sinTenant: true } : {})

const validarTransicion = (estadoActual, estadoNuevo, actor) =>
  Boolean(TRANSICIONES[actor?.tipo]?.[estadoActual]?.includes(estadoNuevo))

/** Estado que queda despues de que el actor escribe un mensaje. */
const estadoTrasMensaje = (estadoActual, actor) => {
  if (esSoporte(actor)) return 'esperando_usuario'
  return ESTADOS_REABIERTOS_POR_USUARIO.includes(estadoActual) ? 'abierto' : estadoActual
}

const puedeRecibirMensajes = (estado) => estado !== 'cerrado'

const calcularResueltoAt = (estadoNuevo, resueltoAtActual, ahora) =>
  ESTADOS_FINALES.includes(estadoNuevo) ? resueltoAtActual || ahora : null

const nombreVisibleActor = (actor) =>
  esSoporte(actor) ? `Equipo Bourgelat (${actor.nombre})` : actor?.nombre || 'Usuario'

const construirActorUsuario = (usuario, { ip = null, userAgent = null } = {}) => ({
  tipo: 'usuario',
  id: usuario.id,
  nombre: usuario.nombre,
  email: usuario.email || null,
  clinicaId: usuario.clinicaId || null,
  roles: [usuario.rol, ...(Array.isArray(usuario.rolesAdicionales) ? usuario.rolesAdicionales : [])].filter(Boolean),
  ip,
  userAgent,
})

const construirActorSoporte = ({ id = null, nombre } = {}) => {
  const firma = String(nombre ?? '').trim()

  if (!firma) {
    throw new Error('El actor de soporte necesita un nombre (firma) para que la clinica sepa quien responde')
  }

  return { tipo: 'soporte', id, nombre: firma.slice(0, 80) }
}

// Solo estas claves del contexto tecnico se guardan, y recortadas: el valor
// llega del navegador y no debe convertirse en un campo libre.
const CAMPOS_CONTEXTO = {
  ruta: 200,
  userAgent: 300,
  viewport: 20,
  rol: 40,
  idioma: 20,
  zonaHoraria: 60,
}

const sanitizarContexto = (valor) => {
  let objeto = valor

  if (typeof valor === 'string') {
    try {
      objeto = JSON.parse(valor)
    } catch {
      return null
    }
  }

  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) {
    return null
  }

  const limpio = {}
  for (const [campo, maximo] of Object.entries(CAMPOS_CONTEXTO)) {
    const dato = objeto[campo]
    if (dato !== undefined && dato !== null && dato !== '') {
      limpio[campo] = String(dato).slice(0, maximo)
    }
  }

  return Object.keys(limpio).length > 0 ? limpio : null
}

module.exports = {
  ESTADOS,
  CATEGORIAS,
  PRIORIDADES,
  ETIQUETAS_ESTADO,
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_PRIORIDAD,
  TRANSICIONES,
  formatearCodigoTicket,
  parsearReferenciaTicket,
  esSoporte,
  esAdminClinica,
  puedeVerTicket,
  whereVisibilidad,
  opcionesTenant,
  validarTransicion,
  estadoTrasMensaje,
  puedeRecibirMensajes,
  calcularResueltoAt,
  nombreVisibleActor,
  construirActorUsuario,
  construirActorSoporte,
  sanitizarContexto,
}
