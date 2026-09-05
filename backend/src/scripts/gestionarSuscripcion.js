// Asigna o cancela la suscripcion de una clinica desde el servidor.
//
// Antes esto vivia como dos rutas HTTP exclusivas del rol superadmin
// (POST /api/suscripciones y PATCH /api/suscripciones/:id/cancelar). Se movieron
// aca para que ninguna cuenta con poder sobre TODAS las clinicas quede expuesta
// en el login publico: operar el negocio ahora exige acceso al servidor, igual
// que crear un superadmin o rotar las claves de cifrado.
//
// Uso:
//   npm run suscripcion:asignar  -- --email admin@laclinica.com --plan activo
//   npm run suscripcion:cancelar -- --email admin@laclinica.com --confirmar

const dotenv = require('dotenv')

dotenv.config()

const { Op } = require('sequelize')

const sequelize = require('../config/database')
const Usuario = require('../models/Usuario')
const Clinica = require('../models/Clinica')
const Suscripcion = require('../models/Suscripcion')
const { PLANES_PUBLICOS, construirSuscripcion, formatDateOnly } = require('../config/planes')
const { ESTADOS_VIGENTES } = require('../services/suscripcionService')

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
Gestiona la suscripcion de una clinica. Reemplaza las rutas de superadmin.

Planes disponibles: ${Object.keys(PLANES_PUBLICOS).join(', ')}

Asignar un plan (cancela la suscripcion vigente y crea la nueva):
  npm run suscripcion:asignar -- --email admin@laclinica.com --plan activo
  npm run suscripcion:asignar -- --clinica-id <uuid> --plan activo \\
      --fecha-fin 2027-01-31 --precio 89000 --metodo-pago transferencia

  Opcionales: --estado (activa por defecto), --fecha-inicio (hoy),
  --fecha-fin (un mes desde el inicio), --precio y los limites los toma del plan.

Cancelar la suscripcion vigente (exige --confirmar):
  npm run suscripcion:cancelar -- --email admin@laclinica.com --confirmar
`)
}

const sumarUnMes = (fechaISO) => {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  fecha.setMonth(fecha.getMonth() + 1)
  return formatDateOnly(fecha)
}

const resolverClinica = async (args) => {
  let clinicaId = args['clinica-id']

  if (!clinicaId) {
    const email = String(args.email).trim().toLowerCase()
    const usuario = await Usuario.findOne({ where: { email }, sinTenant: true })

    if (!usuario) {
      throw new Error(`No existe un usuario con el email ${email}`)
    }

    if (!usuario.clinicaId) {
      throw new Error(`El usuario ${email} no tiene una clinica asociada (rol: ${usuario.rol})`)
    }

    clinicaId = usuario.clinicaId
  }

  const clinica = await Clinica.findByPk(clinicaId)

  if (!clinica) {
    throw new Error(`No existe una clinica con id ${clinicaId}`)
  }

  return clinica
}

const obtenerVigente = (clinicaId) =>
  Suscripcion.findOne({
    where: { clinicaId, estado: { [Op.in]: ESTADOS_VIGENTES } },
    order: [['createdAt', 'DESC']],
    sinTenant: true,
  })

const describirVigente = (vigente) =>
  vigente
    ? `plan ${vigente.plan}, estado ${vigente.estado}, hasta ${vigente.fechaFin}`
    : 'sin suscripcion vigente'

const asignar = async (args) => {
  const plan = args.plan

  if (!plan) {
    throw new Error('Falta --plan. Corre el comando sin argumentos para ver la ayuda.')
  }

  if (!PLANES_PUBLICOS[plan]) {
    throw new Error(
      `Plan no valido: ${plan}. Disponibles: ${Object.keys(PLANES_PUBLICOS).join(', ')}`
    )
  }

  const clinica = await resolverClinica(args)
  const fechaInicio = args['fecha-inicio'] || formatDateOnly()
  const fechaFin = args['fecha-fin'] || sumarUnMes(fechaInicio)

  const vigente = await obtenerVigente(clinica.id)
  console.log(`Clinica: ${clinica.nombre} (${clinica.id})`)
  console.log(`Antes: ${describirVigente(vigente)}`)

  // Misma secuencia que hacia la ruta de superadmin: cancelar lo vigente y
  // crear la nueva en una sola transaccion, sin perder el historial.
  const suscripcion = await sequelize.transaction(async (transaction) => {
    await Suscripcion.update(
      { estado: 'cancelada' },
      {
        where: { clinicaId: clinica.id, estado: { [Op.in]: ESTADOS_VIGENTES } },
        transaction,
      }
    )

    return Suscripcion.create(
      construirSuscripcion({
        clinicaId: clinica.id,
        plan,
        estado: args.estado || 'activa',
        fechaInicio,
        fechaFin,
        precio: args.precio,
        metodoPago: args['metodo-pago'] || null,
        referenciaPago: args['referencia-pago'] || null,
      }),
      { transaction }
    )
  })

  console.log(
    `Ahora: plan ${suscripcion.plan}, estado ${suscripcion.estado}, ` +
      `del ${suscripcion.fechaInicio} al ${suscripcion.fechaFin}, precio ${suscripcion.precio}.`
  )
}

const cancelar = async (args) => {
  const clinica = await resolverClinica(args)
  const vigente = await obtenerVigente(clinica.id)

  console.log(`Clinica: ${clinica.nombre} (${clinica.id})`)

  if (!vigente) {
    console.log('No tiene ninguna suscripcion vigente. No hay nada que cancelar.')
    return
  }

  console.log(`Vigente: ${describirVigente(vigente)}`)

  // Cancelar deja a la clinica en solo lectura: puede consultar y exportar, pero
  // no crear ni editar. Se pide confirmacion explicita para no cortarle la
  // operacion a un cliente por un comando escrito de mas.
  if (args.confirmar !== 'true') {
    console.log(
      '\nEsto dejara a la clinica en SOLO LECTURA. Vuelve a correrlo con --confirmar para aplicarlo.'
    )
    return
  }

  await vigente.update({ estado: 'cancelada' })
  console.log('\nListo: suscripcion cancelada. La clinica quedo en solo lectura.')
}

const main = async () => {
  const modo = process.argv[2]
  const args = parseArgs()

  if (!['asignar', 'cancelar'].includes(modo) || args.help === 'true') {
    printHelp()
    return
  }

  if (!args.email && !args['clinica-id']) {
    console.log('Falta --email o --clinica-id.\n')
    printHelp()
    return
  }

  await sequelize.authenticate()

  if (modo === 'asignar') {
    await asignar(args)
    return
  }

  await cancelar(args)
}

main()
  .catch((error) => {
    console.error(`Error gestionando la suscripcion: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await sequelize.close()
    } catch {
      // No bloquear salida por errores al cerrar la conexion
    }
  })
