// Verifica que una instancia recien guardada quede descifrada en memoria: los
// controladores responden con ella (p. ej. crearPropietario), y sin esto el
// cliente recibia el texto cifrado de la base en vez del nombre o el telefono.
// Se ejecuta con `node src/config/modelEncryption.test.js` (integrado en
// `npm test`). No se conecta a la base de datos.

process.env.INTEGRACIONES_SECRET ||= 'secreto-de-prueba-solo-para-tests-0123456789abcdef'

const assert = require('assert')
const { Sequelize, DataTypes } = require('sequelize')
const { registrarHooksCifrado, estaCifrado } = require('./modelEncryption')

const sequelize = new Sequelize('postgres://u:p@no-db.invalid:5432/x', { logging: false })
const Ficha = sequelize.define('ficha_prueba', {
  nombre: DataTypes.TEXT,
  datos: DataTypes.TEXT,
})
registrarHooksCifrado(Ficha, { campos: ['nombre'], camposJson: ['datos'] })

const main = async () => {
  const ficha = Ficha.build({ nombre: 'Laura Gomez', datos: { telefono: '3000000001' } })

  // Lo que hace Model.create: hooks de antes, INSERT (aqui omitido) y de despues.
  await Ficha.runHooks('beforeCreate', ficha, {})
  assert.ok(estaCifrado(ficha.getDataValue('nombre')), 'antes del INSERT el nombre debe ir cifrado')
  await Ficha.runHooks('afterCreate', ficha, {})
  await Ficha.runHooks('afterSave', ficha, {})

  assert.strictEqual(ficha.nombre, 'Laura Gomez', 'tras crear, la instancia debe quedar descifrada')
  assert.deepStrictEqual(ficha.datos, { telefono: '3000000001' })

  // Lo mismo al editar.
  ficha.set('nombre', 'Laura Gomez Ruiz')
  await Ficha.runHooks('beforeUpdate', ficha, {})
  assert.ok(estaCifrado(ficha.getDataValue('nombre')))
  await Ficha.runHooks('afterUpdate', ficha, {})
  await Ficha.runHooks('afterSave', ficha, {})
  assert.strictEqual(ficha.nombre, 'Laura Gomez Ruiz', 'tras editar, la instancia debe quedar descifrada')

  console.log('modelEncryption: instancias descifradas tras crear y editar')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
