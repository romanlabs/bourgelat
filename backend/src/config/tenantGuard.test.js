// Tests del tenant guard. Se ejecutan con `node src/config/tenantGuard.test.js`
// (integrados en `npm test`). No requieren base de datos: los hooks de
// Sequelize corren antes de abrir conexión, y el camino "query permitida" se
// verifica con un hook centinela registrado después del guard.

const assert = require('assert')
const { Sequelize, DataTypes, Op } = require('sequelize')
const { instalarTenantGuard, contieneClinicaId, includeFiltraTenant } = require('./tenantGuard')

process.env.TENANT_GUARD_MODE = 'strict'

// ── Unit: detección de clinicaId en el where ──────────────────────────────

assert.strictEqual(contieneClinicaId({ clinicaId: 'abc' }), true, 'where plano')
assert.strictEqual(contieneClinicaId({ id: 1, clinicaId: null }), true, 'clinicaId null cuenta como filtro')
assert.strictEqual(contieneClinicaId({ id: 1 }), false, 'where sin tenant')
assert.strictEqual(contieneClinicaId(undefined), false, 'sin where')
assert.strictEqual(
  contieneClinicaId({ [Op.and]: [{ estado: 'activa' }, { clinicaId: 'abc' }] }),
  true,
  'clinicaId dentro de Op.and'
)
assert.strictEqual(
  contieneClinicaId({ [Op.or]: [{ estado: 'x' }], fecha: { [Op.gt]: new Date() } }),
  false,
  'operadores sin tenant'
)
assert.strictEqual(contieneClinicaId({ '$propietario.clinicaId$': 'abc' }), true, 'referencia anidada $tabla.clinicaId$')
assert.strictEqual(contieneClinicaId({ clinicaId: { [Op.ne]: null } }), true, 'clinicaId con operador')

assert.strictEqual(
  includeFiltraTenant([{ where: { clinicaId: 'abc' } }]),
  true,
  'include con where de tenant'
)
assert.strictEqual(
  includeFiltraTenant([{ where: { clinicaId: 'abc' }, required: false }]),
  false,
  'include required:false no filtra la raíz'
)
assert.strictEqual(
  includeFiltraTenant([{ include: [{ where: { clinicaId: 'abc' } }] }]),
  true,
  'include anidado con tenant'
)

// ── Integración: hooks sobre una instancia Sequelize sin conexión ─────────

const sequelize = new Sequelize('test', 'test', 'test', {
  dialect: 'postgres',
  logging: false,
})

instalarTenantGuard(sequelize)

// Centinela DESPUÉS del guard: si una query lo alcanza, el guard la dejó pasar.
const CENTINELA = 'CENTINELA_QUERY_PERMITIDA'
for (const hook of ['beforeFind', 'beforeCount', 'beforeBulkUpdate', 'beforeBulkDestroy']) {
  sequelize.addHook(hook, () => {
    throw new Error(CENTINELA)
  })
}

const ModeloTenant = sequelize.define('ModeloTenant', {
  clinicaId: { type: DataTypes.UUID, allowNull: false },
  nombre: DataTypes.STRING,
})

const ModeloGlobal = sequelize.define('ModeloGlobal', {
  nombre: DataTypes.STRING,
})

const esperarRechazo = async (promesa, contexto) => {
  await assert.rejects(promesa, /TenantGuard/, `${contexto}: el guard debía rechazar la query`)
}

const esperarPermitida = async (promesa, contexto) => {
  await assert.rejects(
    promesa,
    (error) => error.message === CENTINELA,
    `${contexto}: el guard debía dejar pasar la query`
  )
}

const main = async () => {
  // Rechazos: modelo tenant sin filtro
  await esperarRechazo(ModeloTenant.findAll(), 'findAll sin where')
  await esperarRechazo(ModeloTenant.findOne({ where: { nombre: 'x' } }), 'findOne sin tenant')
  await esperarRechazo(ModeloTenant.findByPk('11111111-1111-1111-1111-111111111111'), 'findByPk')
  await esperarRechazo(ModeloTenant.count(), 'count sin where')
  await esperarRechazo(
    ModeloTenant.update({ nombre: 'y' }, { where: { nombre: 'x' } }),
    'update sin tenant'
  )
  await esperarRechazo(ModeloTenant.destroy({ where: { nombre: 'x' } }), 'destroy sin tenant')

  // Permitidas: filtro de tenant presente en cualquier forma
  await esperarPermitida(ModeloTenant.findAll({ where: { clinicaId: 'abc' } }), 'findAll con tenant')
  await esperarPermitida(
    ModeloTenant.findAll({ where: { [Op.and]: [{ clinicaId: 'abc' }, { nombre: 'x' }] } }),
    'findAll con tenant en Op.and'
  )
  await esperarPermitida(ModeloTenant.count({ where: { clinicaId: 'abc' } }), 'count con tenant')
  await esperarPermitida(
    ModeloTenant.update({ nombre: 'y' }, { where: { clinicaId: 'abc' } }),
    'update con tenant'
  )
  await esperarPermitida(
    ModeloTenant.destroy({ where: { clinicaId: 'abc' } }),
    'destroy con tenant'
  )

  // Escape explícito para queries globales
  await esperarPermitida(ModeloTenant.findAll({ sinTenant: true }), 'findAll sinTenant')
  await esperarPermitida(
    ModeloTenant.destroy({ where: { nombre: 'x' }, sinTenant: true }),
    'destroy sinTenant'
  )

  // Modelos sin clinicaId quedan exentos
  await esperarPermitida(ModeloGlobal.findAll(), 'modelo global exento')

  // Modo log: no lanza, solo registra
  process.env.TENANT_GUARD_MODE = 'log'
  const logger = require('../utils/logger')
  const errorOriginal = logger.error
  let logueado = null
  logger.error = (mensaje) => {
    logueado = mensaje
  }
  try {
    await esperarPermitida(ModeloTenant.findAll(), 'modo log deja pasar')
    assert.ok(
      typeof logueado === 'string' && logueado.includes('TenantGuard'),
      'modo log debía registrar la violación'
    )
  } finally {
    logger.error = errorOriginal
    process.env.TENANT_GUARD_MODE = 'strict'
  }

  console.log('tenantGuard.test.js: todos los tests pasaron ✔')
}

main().catch((error) => {
  console.error('tenantGuard.test.js FALLÓ:', error.message)
  process.exit(1)
})
