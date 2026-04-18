const bcrypt = require('bcryptjs')
const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const Usuario = require('../models/Usuario')

const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

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
  }

  return values
}

const clean = (value) => {
  if (value === undefined || value === null) return null
  const result = String(value).trim()
  return result || null
}

const normalizeEmail = (value) => {
  const result = clean(value)
  return result ? result.toLowerCase() : null
}

const normalizePhone = (value) => {
  const result = clean(value)
  if (!result) return null

  const digits = result.replace(/\D/g, '')
  const withoutPrefix = digits.length > 10 && digits.startsWith('57') ? digits.slice(2) : digits
  return withoutPrefix.slice(0, 10) || null
}

const printHelp = () => {
  console.log(`
Uso:
  npm run create:superadmin -- --name "Tu Nombre" --email admin@tu-dominio.com --password "ClaveSegura1!"

Opcional:
  --telefono 3001234567

Tambien puedes usar variables de entorno:
  SUPERADMIN_NAME
  SUPERADMIN_EMAIL
  SUPERADMIN_PASSWORD
  SUPERADMIN_TELEFONO
`)
}

const main = async () => {
  const args = parseArgs()

  if (args.help === 'true') {
    printHelp()
    return
  }

  const nombre = clean(args.name || process.env.SUPERADMIN_NAME)
  const email = normalizeEmail(args.email || process.env.SUPERADMIN_EMAIL)
  const password = clean(args.password || process.env.SUPERADMIN_PASSWORD)
  const telefono = normalizePhone(args.telefono || process.env.SUPERADMIN_TELEFONO)

  if (!nombre || !email || !password) {
    throw new Error('Nombre, email y password son obligatorios para crear el superadmin')
  }

  if (!passwordFuerteRegex.test(password)) {
    throw new Error(
      'La password debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial'
    )
  }

  if (telefono && !/^3\d{9}$/.test(telefono)) {
    throw new Error('El telefono debe ser un celular colombiano valido de 10 digitos')
  }

  await sequelize.authenticate()

  const existente = await Usuario.findOne({ where: { email } })

  if (existente && existente.rol !== 'superadmin') {
    throw new Error('Ya existe un usuario con ese email y no es superadmin')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  if (existente) {
    await existente.update({
      nombre,
      password: passwordHash,
      rol: 'superadmin',
      clinicaId: null,
      telefono,
      activo: true,
      bloqueadoHasta: null,
      intentosFallidos: 0,
    })

    console.log(`Superadmin actualizado: ${email}`)
  } else {
    await Usuario.create({
      nombre,
      email,
      password: passwordHash,
      rol: 'superadmin',
      clinicaId: null,
      telefono,
      activo: true,
      rolesAdicionales: [],
    })

    console.log(`Superadmin creado: ${email}`)
  }

  console.log('Puedes ingresar desde /login con las mismas credenciales.')
}

main()
  .catch((error) => {
    console.error(`Error creando superadmin: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await sequelize.close()
    } catch {
      // No bloquear salida por errores al cerrar la conexion
    }
  })
