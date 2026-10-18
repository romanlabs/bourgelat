// Borra una cuenta que nunca se usó (prueba, registro abandonado o de bot):
// la clínica, sus usuarios y lo que creó el registro. Se niega si la clínica
// tiene cualquier dato real o usuarios que no se pidieron (ver borrarCuentaReglas.js).
// Va por CLI en el servidor, como gestionarSuscripcion.js: nada con este poder
// queda expuesto por HTTP.
//
// Uso (sin --confirmar solo muestra qué haría):
//   npm run cuenta:borrar -- --email prueba@clinica.co [--email otra@clinica.co]
//   npm run cuenta:borrar -- --email prueba@clinica.co --confirmar

const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const logger = require('../utils/logger')
const { evaluarBorrado } = require('./borrarCuentaReglas')

const leerArgs = () => {
  const args = process.argv.slice(2)
  const emails = []
  let confirmar = false

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--confirmar') confirmar = true
    if (args[index] === '--email' && args[index + 1]) {
      emails.push(String(args[index + 1]).trim().toLowerCase())
      index += 1
    }
  }

  return { emails, confirmar }
}

const consultar = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, transaction, type: sequelize.QueryTypes.SELECT })

const tablasConClinica = () =>
  consultar(
    `SELECT table_name FROM information_schema.columns
     WHERE column_name = 'clinicaId' AND table_schema = 'public' ORDER BY table_name`
  ).then((filas) => filas.map((fila) => fila.table_name))

const contarPorTabla = async (tablas, clinicaId, transaction) => {
  const conteos = {}
  for (const tabla of tablas) {
    const [{ total }] = await consultar(
      `SELECT count(*)::int AS total FROM "${tabla}" WHERE "clinicaId" = :clinicaId`,
      { clinicaId },
      transaction
    )
    conteos[tabla] = total
  }
  return conteos
}

const describir = async (email, tablas) => {
  const [usuario] = await consultar(
    `SELECT id, email, nombre, rol, "clinicaId", "createdAt" FROM usuarios WHERE lower(email) = :email`,
    { email }
  )
  if (!usuario) return { email, existe: false }

  if (!usuario.clinicaId) {
    return { email, existe: true, usuario, clinica: null, usuarios: [usuario], conteos: {} }
  }

  const [clinica] = await consultar(
    `SELECT id, nombre, "createdAt" FROM clinicas WHERE id = :id`,
    { id: usuario.clinicaId }
  )
  const usuarios = await consultar(
    `SELECT id, email, rol FROM usuarios WHERE "clinicaId" = :id`,
    { id: usuario.clinicaId }
  )
  const conteos = await contarPorTabla(tablas, usuario.clinicaId)
  return { email, existe: true, usuario, clinica, usuarios, conteos }
}

const borrar = async ({ clinica, usuarios }) =>
  sequelize.transaction(async (transaction) => {
    const ids = usuarios.map((usuario) => usuario.id)
    // refresh_tokens y auditoria_logs no se borran en cascada con la clínica.
    await sequelize.query(`DELETE FROM refresh_tokens WHERE "usuarioId" IN (:ids)`, { replacements: { ids }, transaction })
    await sequelize.query(`DELETE FROM usuarios WHERE id IN (:ids)`, { replacements: { ids }, transaction })
    if (clinica) {
      await sequelize.query(`DELETE FROM refresh_tokens WHERE "clinicaId" = :id`, { replacements: { id: clinica.id }, transaction })
      await sequelize.query(`DELETE FROM auditoria_logs WHERE "clinicaId" = :id`, { replacements: { id: clinica.id }, transaction })
      // El resto (suscripciones, aceptaciones, consultorios…) cae en cascada.
      await sequelize.query(`DELETE FROM clinicas WHERE id = :id`, { replacements: { id: clinica.id }, transaction })
    }
  })

const main = async () => {
  const { emails, confirmar } = leerArgs()
  if (emails.length === 0) {
    throw new Error('Indica al menos un --email')
  }

  const tablas = await tablasConClinica()
  const vistas = new Set()

  for (const email of emails) {
    const cuenta = await describir(email, tablas)
    console.log(`\n=== ${email}`)
    if (!cuenta.existe) {
      console.log('No existe ningún usuario con ese correo.')
      continue
    }

    const { usuario, clinica, usuarios, conteos } = cuenta
    console.log(`Usuario: ${usuario.nombre} (${usuario.rol}), creado ${new Date(usuario.createdAt).toISOString()}`)
    console.log(clinica ? `Clínica: ${clinica.nombre} (${clinica.id}), creada ${new Date(clinica.createdAt).toISOString()}` : 'Sin clínica asociada')
    console.log(`Usuarios de la clínica: ${usuarios.map((item) => `${item.email} (${item.rol})`).join(', ')}`)
    const conDatos = Object.entries(conteos).filter(([, total]) => total > 0)
    console.log(`Registros: ${conDatos.map(([tabla, total]) => `${tabla}=${total}`).join(', ') || 'ninguno'}`)

    const { puede, motivos } = evaluarBorrado({ conteos, usuarios, emailsPedidos: emails })
    if (!puede) {
      console.log(`NO SE BORRA: ${motivos.join('; ')}`)
      continue
    }
    if (clinica && vistas.has(clinica.id)) {
      console.log('Misma clínica que un correo anterior: ya cubierta.')
      continue
    }
    if (clinica) vistas.add(clinica.id)

    if (!confirmar) {
      console.log('Se puede borrar. Repite con --confirmar para hacerlo.')
      continue
    }

    await borrar({ clinica, usuarios })
    logger.warn({ contexto: 'cuenta:borrar', mensaje: `Cuenta borrada: ${email}`, clinicaId: clinica?.id || null })
    console.log('Borrada.')
  }
}

module.exports = { consultar, tablasConClinica, describir, borrar }

// Solo corre como CLI; limpiarNoVerificadas.js reutiliza las funciones de arriba.
if (require.main === module) {
  main()
    .then(() => sequelize.close())
    .catch(async (error) => {
      console.error(`Error: ${error.message}`)
      await sequelize.close()
      process.exit(1)
    })
}
