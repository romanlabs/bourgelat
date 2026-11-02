// Tests de desactivar un insumo clinico. Se ejecutan con
// `node src/controllers/insumoClinicoEliminar.test.js` (integrado en `npm test`).
// No requieren base de datos: se simula la respuesta de sequelize.query, asi que
// los hooks del tenantGuard corren de verdad, en modo strict como en produccion.

process.env.TENANT_GUARD_MODE = 'strict'

const assert = require('assert')
const sequelize = require('../config/database')
const InsumoClinico = require('../models/InsumoClinico')
const ServicioClinicoInsumo = require('../models/ServicioClinicoInsumo')
const { eliminarInsumo } = require('./insumoClinicoController')

const CLINICA = '11111111-1111-4111-8111-111111111111'
const INSUMO = '22222222-2222-4222-8222-222222222222'

const req = { params: { id: INSUMO }, usuario: { clinicaId: CLINICA } }

const crearRes = () => ({
  statusCode: 200,
  body: null,
  status(codigo) {
    this.statusCode = codigo
    return this
  },
  json(cuerpo) {
    this.body = cuerpo
    return this
  },
})

const main = async () => {
  let actualizacion = null
  const insumo = {
    id: INSUMO,
    update: async (valores) => {
      actualizacion = valores
    },
  }
  InsumoClinico.findOne = async () => insumo

  let recetaSimulada = null
  const consultas = []
  sequelize.query = async (sql, opciones) => {
    consultas.push(String(sql))
    return opciones?.plain ? recetaSimulada : []
  }

  // Sin receta activa: el insumo se desactiva y la consulta queda dentro de la clinica
  const desactivado = crearRes()
  await eliminarInsumo(req, desactivado)
  assert.strictEqual(desactivado.statusCode, 200, `sin receta debia desactivar: ${desactivado.body?.error}`)
  assert.deepStrictEqual(actualizacion, { activo: false }, 'el insumo debia quedar inactivo')
  assert.ok(
    consultas.some((sql) => sql.includes('servicio_clinico_insumos') && sql.includes(CLINICA)),
    'la busqueda de recetas debe filtrar por la clinica'
  )

  // Con receta en un servicio activo: no se desactiva y lo dice
  actualizacion = null
  recetaSimulada = ServicioClinicoInsumo.build({ insumoClinicoId: INSUMO, clinicaId: CLINICA })
  const enUso = crearRes()
  await eliminarInsumo(req, enUso)
  assert.strictEqual(enUso.statusCode, 409, `con receta activa debia responder 409: ${enUso.body?.error}`)
  assert.strictEqual(actualizacion, null, 'un insumo en uso no se desactiva')

  console.log('insumoClinicoEliminar.test.js: todos los tests pasaron ✔')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('insumoClinicoEliminar.test.js FALLÓ:', error.message)
    process.exit(1)
  })
