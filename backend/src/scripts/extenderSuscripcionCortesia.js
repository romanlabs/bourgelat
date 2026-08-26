const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const Usuario = require('../models/Usuario')
const Clinica = require('../models/Clinica')
const Suscripcion = require('../models/Suscripcion')
const { crearSuscripcionCortesia, CORTESIA_END_DATE } = require('../config/planes')

const parseArgs = () => {
  const args = process.argv.slice(2)
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
Da a una clinica el plan Cortesia: activa, sin fecha de vencimiento real
(hasta ${CORTESIA_END_DATE}), sin limite de mascotas ni almacenamiento
restrictivo para el piloto. No borra el historial de suscripciones — si ya
tiene una fila vigente, la actualiza en el sitio; si no, crea una nueva.

Uso (por email de un usuario de esa clinica):
  npm run suscripcion:cortesia -- --email admin@laclinica.com

Uso (por id de clinica, si ya lo tienes):
  npm run suscripcion:cortesia -- --clinica-id <uuid>
`)
}

const main = async () => {
  const args = parseArgs()

  if (args.help === 'true' || (!args.email && !args['clinica-id'])) {
    printHelp()
    return
  }

  await sequelize.authenticate()

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

  // Se toma la fila mas reciente sin importar el estado: si la clinica ya
  // tiene una suscripcion (vigente o vencida), se actualiza esa misma fila en
  // vez de crear una duplicada. El historial de la clinica no se pierde.
  const suscripcionExistente = await Suscripcion.findOne({
    where: { clinicaId },
    order: [['createdAt', 'DESC']],
  })

  const datosCortesia = crearSuscripcionCortesia(clinicaId)

  if (suscripcionExistente) {
    await suscripcionExistente.update({
      plan: datosCortesia.plan,
      estado: datosCortesia.estado,
      fechaFin: datosCortesia.fechaFin,
      precio: datosCortesia.precio,
      limiteUsuarios: datosCortesia.limiteUsuarios,
      limiteMascotas: datosCortesia.limiteMascotas,
      almacenamientoMB: datosCortesia.almacenamientoMB,
      funcionalidades: datosCortesia.funcionalidades,
    })
    console.log(`Suscripcion actualizada a Cortesia para "${clinica.nombre}" (clinicaId: ${clinicaId}).`)
  } else {
    await Suscripcion.create(datosCortesia)
    console.log(`Suscripcion Cortesia creada para "${clinica.nombre}" (clinicaId: ${clinicaId}).`)
  }

  console.log(`Vigente hasta: ${CORTESIA_END_DATE} (sin limite de mascotas ni funcionalidades).`)
}

main()
  .catch((error) => {
    console.error(`Error extendiendo la suscripcion: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await sequelize.close()
    } catch {
      // No bloquear salida por errores al cerrar la conexion
    }
  })
