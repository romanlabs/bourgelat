// Opera los tickets de soporte desde el servidor. Es la herramienta del equipo
// de Bourgelat mientras no exista el panel web de soporte (ver docs/soporte.md).
//
// El texto de cada respuesta lo redacta una persona; este script solo lo
// entrega. Arma un actor de soporte con la firma y llama a soporteService:
// las mismas funciones que usara el panel web, asi que estados, correos,
// eventos del hilo y auditoria se comportan igual por cualquiera de las dos
// puertas.
//
// Uso:
//   npm run soporte:listar    -- [--estado activos] [--clinica-id <uuid>]
//   npm run soporte:ver       -- --ticket 42
//   npm run soporte:responder -- --ticket 42 --firma "Sergio" --mensaje "..." [--estado resuelto] --confirmar
//   npm run soporte:estado    -- --ticket 42 --firma "Sergio" --estado en_progreso

require('../config/timezone')
const fs = require('fs')
const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const soporteService = require('../services/soporteService')
const {
  ESTADOS,
  ETIQUETAS_ESTADO,
  ETIQUETAS_CATEGORIA,
  ETIQUETAS_PRIORIDAD,
  construirActorSoporte,
} = require('../services/soporteReglas')

const MODOS = ['listar', 'ver', 'responder', 'estado']
const FILTROS_LISTADO = ['activos', 'todos', ...ESTADOS]

// Leer no deja rastro a nombre de nadie, asi que no exige firma.
const ACTOR_CONSULTA = construirActorSoporte({ nombre: 'consulta' })

const parseArgs = () => {
  const args = process.argv.slice(3)
  const values = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) continue

    const key = arg.slice(2)
    const value = args[index + 1]

    if (!value || value.startsWith('--')) {
      values[key] = 'true'
      continue
    }

    values[key] = value
    index += 1
  }

  return values
}

const printHelp = () => {
  console.log(`
Opera los tickets de soporte de las clinicas desde el servidor.

Estados: ${ESTADOS.join(', ')}

Listar la bandeja (por defecto, todo lo que no esta cerrado):
  npm run soporte:listar -- [--estado activos|todos|abierto|...] [--clinica-id <uuid>]

Ver un ticket con su hilo, contexto tecnico y captura:
  npm run soporte:ver -- --ticket 42

Responder (muestra una vista previa; se envia solo con --confirmar):
  npm run soporte:responder -- --ticket 42 --firma "Sergio" --mensaje "Hola, ya lo revisamos..."
  npm run soporte:responder -- --ticket 42 --firma "Sergio" --mensaje-archivo respuesta.txt --estado resuelto --confirmar

  En --mensaje, escribe \\n para un salto de linea. Sin --estado, el ticket
  queda "Esperando tu respuesta" (esperando_usuario).

Cambiar el estado sin escribir mensaje:
  npm run soporte:estado -- --ticket 42 --firma "Sergio" --estado en_progreso

--ticket acepta el numero (42), el codigo (SOP-00042) o el id.
--firma es quien responde: la clinica lo ve como "Equipo Bourgelat (Sergio)".
`)
}

const formatearFecha = (valor) =>
  valor
    ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
    : '-'

const indentar = (texto, espacios = 4) =>
  String(texto)
    .split('\n')
    .map((linea) => `${' '.repeat(espacios)}${linea}`)
    .join('\n')

const describirAutor = (mensaje) => {
  if (mensaje.autorTipo === 'soporte') return `Equipo Bourgelat (${mensaje.autorNombre})`
  if (mensaje.autorTipo === 'sistema') return 'Evento'
  return `${mensaje.autorNombre} (clinica)`
}

const exigir = (args, clave, descripcion) => {
  if (!args[clave] || args[clave] === 'true') {
    throw new Error(`Falta --${clave} ${descripcion}. Corre el comando sin argumentos para ver la ayuda.`)
  }
  return args[clave]
}

const validarEstado = (estado) => {
  if (!ESTADOS.includes(estado)) {
    throw new Error(`Estado no valido: ${estado}. Disponibles: ${ESTADOS.join(', ')}`)
  }
  return estado
}

const listar = async (args) => {
  const filtro = args.estado || 'activos'

  if (!FILTROS_LISTADO.includes(filtro)) {
    throw new Error(`Filtro no valido: ${filtro}. Disponibles: ${FILTROS_LISTADO.join(', ')}`)
  }

  const { tickets, total } = await soporteService.listarTickets(ACTOR_CONSULTA, {
    estado: filtro === 'todos' ? undefined : filtro,
    clinicaId: args['clinica-id'],
    limite: 50,
  })

  if (tickets.length === 0) {
    console.log(`No hay tickets (${filtro}).`)
    return
  }

  for (const ticket of tickets) {
    console.log(
      [
        ticket.codigo,
        ETIQUETAS_ESTADO[ticket.estado].padEnd(22),
        `[${ticket.prioridad}]`.padEnd(8),
        (ticket.clinica?.nombre || '-').slice(0, 28).padEnd(28),
        ticket.asunto,
        `· ${formatearFecha(ticket.ultimaActividadAt)}`,
      ].join('  ')
    )
  }

  console.log(`\n${tickets.length} de ${total} tickets (${filtro}).`)
}

const ver = async (args) => {
  const ticket = await soporteService.obtenerTicket(ACTOR_CONSULTA, exigir(args, 'ticket', 'con el numero del ticket'))

  console.log(`\n${ticket.codigo} · ${ticket.asunto}`)
  console.log(`Clinica:    ${ticket.clinica?.nombre || '-'} (${ticket.clinicaId})`)
  console.log(
    `Reporta:    ${ticket.creadoPor?.nombre || 'Usuario eliminado'}` +
      (ticket.creadoPor?.email ? ` <${ticket.creadoPor.email}>` : '') +
      (ticket.creadoPor?.rol ? ` · ${ticket.creadoPor.rol}` : '')
  )
  console.log(`Estado:     ${ETIQUETAS_ESTADO[ticket.estado]}${ticket.asignadoA ? ` · lo lleva ${ticket.asignadoA}` : ''}`)
  console.log(`Categoria:  ${ETIQUETAS_CATEGORIA[ticket.categoria]}`)
  console.log(`Prioridad:  ${ETIQUETAS_PRIORIDAD[ticket.prioridad]}`)
  console.log(`Modulo:     ${ticket.modulo || '-'}`)
  console.log(`Abierto:    ${formatearFecha(ticket.createdAt)}`)

  if (ticket.capturaUrl) {
    console.log(`Captura:    ${ticket.capturaUrl}`)
  }

  if (ticket.contexto) {
    console.log('Contexto:')
    for (const [clave, valor] of Object.entries(ticket.contexto)) {
      console.log(`    ${clave}: ${valor}`)
    }
  }

  console.log('\nHilo:')
  for (const mensaje of ticket.mensajes || []) {
    console.log(`\n  [${formatearFecha(mensaje.createdAt)}] ${describirAutor(mensaje)}`)
    console.log(indentar(mensaje.mensaje))
  }
  console.log('')
}

const leerMensaje = (args) => {
  if (args['mensaje-archivo'] && args['mensaje-archivo'] !== 'true') {
    return fs.readFileSync(args['mensaje-archivo'], 'utf8').trim()
  }

  return exigir(args, 'mensaje', 'con el texto de la respuesta (o --mensaje-archivo)')
    .replace(/\\n/g, '\n')
    .trim()
}

const responder = async (args) => {
  const referencia = exigir(args, 'ticket', 'con el numero del ticket')
  const actor = construirActorSoporte({ nombre: exigir(args, 'firma', 'con tu nombre') })
  const mensaje = leerMensaje(args)
  const estado = args.estado ? validarEstado(args.estado) : null

  const ticket = await soporteService.obtenerTicket(actor, referencia)
  const estadoFinal = estado || 'esperando_usuario'

  console.log(`\nTicket:   ${ticket.codigo} · ${ticket.asunto}`)
  console.log(`Clinica:  ${ticket.clinica?.nombre || '-'}`)
  console.log(`Para:     ${ticket.creadoPor?.nombre || '-'}${ticket.creadoPor?.email ? ` <${ticket.creadoPor.email}>` : ''}`)
  console.log(`Estado:   ${ETIQUETAS_ESTADO[ticket.estado]} -> ${ETIQUETAS_ESTADO[estadoFinal]}`)
  console.log(`Firma:    Equipo Bourgelat (${actor.nombre})`)
  console.log('Mensaje:')
  console.log(indentar(mensaje))

  if (args.confirmar !== 'true') {
    console.log('\nVista previa: no se envio nada. Vuelve a correr el comando con --confirmar para enviarlo.')
    return
  }

  const actualizado = await soporteService.agregarMensaje(actor, ticket.id, mensaje, {
    estado: estado || undefined,
  })

  console.log(
    `\nListo: respuesta guardada en ${actualizado.codigo}. Estado: ${ETIQUETAS_ESTADO[actualizado.estado]}.` +
      ' La clinica la ve en Soporte y recibe el aviso por correo (si SMTP esta configurado).'
  )
}

const cambiarEstado = async (args) => {
  const referencia = exigir(args, 'ticket', 'con el numero del ticket')
  const actor = construirActorSoporte({ nombre: exigir(args, 'firma', 'con tu nombre') })
  const estado = validarEstado(exigir(args, 'estado', 'con el estado nuevo'))

  const actualizado = await soporteService.cambiarEstado(actor, referencia, estado)

  console.log(`Listo: ${actualizado.codigo} quedo en "${ETIQUETAS_ESTADO[actualizado.estado]}".`)
}

const main = async () => {
  const modo = process.argv[2]
  const args = parseArgs()

  if (!MODOS.includes(modo) || args.help === 'true') {
    printHelp()
    return
  }

  await sequelize.authenticate()

  if (modo === 'listar') return listar(args)
  if (modo === 'ver') return ver(args)
  if (modo === 'responder') return responder(args)
  return cambiarEstado(args)
}

main()
  .catch((error) => {
    console.error(`Error en soporte: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await sequelize.close()
    } catch {
      // No bloquear salida por errores al cerrar la conexion
    }
  })
