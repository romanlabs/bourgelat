// Borra registros que nunca verificaron su correo: clínicas cuyo administrador
// (registro local) sigue sin verificar pasados N días y que no tienen ningún dato.
// Reutiliza las funciones y reglas de seguridad de `cuenta:borrar`. Las cuentas
// de Google/OAuth nacen verificadas, así que nunca entran aquí.
//
// Uso (sin --confirmar solo muestra qué haría):
//   npm run cuenta:limpiar-no-verificadas -- --dias 7
//   npm run cuenta:limpiar-no-verificadas -- --dias 7 --confirmar

const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const logger = require('../utils/logger')
const { evaluarBorrado } = require('./borrarCuentaReglas')
const { consultar, tablasConClinica, describir, borrar } = require('./borrarCuenta')

const leerArgs = () => {
  const args = process.argv.slice(2)
  let dias = 7
  let confirmar = false

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--confirmar') confirmar = true
    if (args[index] === '--dias' && args[index + 1]) {
      dias = Number(args[index + 1])
      index += 1
    }
  }

  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error('--dias debe ser un entero de 1 o más')
  }
  return { dias, confirmar }
}

const main = async () => {
  const { dias, confirmar } = leerArgs()
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

  // Administradores de registro local que nunca verificaron el correo.
  const candidatos = await consultar(
    `SELECT email FROM usuarios
     WHERE rol = 'admin' AND "emailVerificado" = false AND "proveedorAuth" = 'local'
       AND "clinicaId" IS NOT NULL AND "createdAt" < :limite
     ORDER BY "createdAt"`,
    { limite }
  )

  console.log(`Registros sin verificar con más de ${dias} día(s): ${candidatos.length}`)
  const tablas = await tablasConClinica()
  const vistas = new Set()
  let borrables = 0
  let borradas = 0

  for (const { email: emailCrudo } of candidatos) {
    const email = String(emailCrudo).toLowerCase()
    const cuenta = await describir(email, tablas)
    const { clinica, usuarios, conteos } = cuenta
    if (!clinica || vistas.has(clinica.id)) continue

    // Los usuarios de la clínica son los "pedidos": solo se borra si es un registro solitario.
    const { puede, motivos } = evaluarBorrado({ conteos, usuarios, emailsPedidos: [email] })
    if (!puede) {
      console.log(`- ${email}: NO SE BORRA (${motivos.join('; ')})`)
      continue
    }
    vistas.add(clinica.id)
    borrables += 1

    if (!confirmar) {
      console.log(`- ${email}: se puede borrar (clínica creada ${new Date(clinica.createdAt).toISOString()})`)
      continue
    }

    await borrar({ clinica, usuarios })
    borradas += 1
    logger.warn({ contexto: 'cuenta:limpiar-no-verificadas', mensaje: `Registro sin verificar borrado: ${email}`, clinicaId: clinica.id })
    console.log(`- ${email}: borrada`)
  }

  console.log(
    confirmar
      ? `\nBorradas: ${borradas}.`
      : `\nSe podrían borrar: ${borrables}. Repite con --confirmar para hacerlo.`
  )
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(`Error: ${error.message}`)
    await sequelize.close()
    process.exit(1)
  })
