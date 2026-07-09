const logger = require('../utils/logger')

// ── Tenant guard ──────────────────────────────────────────────────────────
//
// Red de seguridad multi-tenant: hooks globales de Sequelize que rechazan
// cualquier query sobre un modelo con columna `clinicaId` cuyo `where` no
// filtre por tenant. Las ~280 queries existentes ya filtran a mano; este
// guard garantiza que el PRÓXIMO endpoint no pueda olvidarlo.
//
// - Queries legítimamente globales (login por email, superadmin, jobs de
//   limpieza) se marcan explícitamente con `sinTenant: true` en las opciones.
//   La marca es greppable: `grep -rn "sinTenant: true" src/` audita todas las
//   queries cross-tenant del backend.
// - Modos vía TENANT_GUARD_MODE: `strict` lanza error (default fuera de
//   producción), `log` solo registra (default en producción, para que un
//   falso positivo nunca tumbe un endpoint), `off` desactiva.
// - Cobertura: beforeFind (findAll/findOne/findByPk/findAndCountAll),
//   beforeCount, beforeBulkUpdate (Model.update) y beforeBulkDestroy
//   (Model.destroy). Los agregados sin hooks (Model.sum/min/max) y el SQL
//   crudo (sequelize.query) quedan fuera; los updates/destroy de instancia
//   ya están cubiertos porque la instancia se buscó con un find validado.

const MODOS = new Set(['strict', 'log', 'off'])
const MAX_PROFUNDIDAD = 10

const resolverModo = () => {
  const modo = (process.env.TENANT_GUARD_MODE || '').trim().toLowerCase()
  if (MODOS.has(modo)) return modo
  return process.env.NODE_ENV === 'production' ? 'log' : 'strict'
}

// Busca la clave `clinicaId` (o una referencia anidada tipo "$tabla.clinicaId$")
// en el árbol del where, descendiendo por arrays y operadores Op.* (claves Symbol).
const contieneClinicaId = (nodo, profundidad = 0) => {
  if (!nodo || typeof nodo !== 'object' || profundidad > MAX_PROFUNDIDAD) return false
  if (Array.isArray(nodo)) return nodo.some((hijo) => contieneClinicaId(hijo, profundidad + 1))

  for (const clave of Object.keys(nodo)) {
    if (clave === 'clinicaId' || clave.endsWith('.clinicaId$')) return true
    if (contieneClinicaId(nodo[clave], profundidad + 1)) return true
  }

  return Object.getOwnPropertySymbols(nodo).some((simbolo) =>
    contieneClinicaId(nodo[simbolo], profundidad + 1)
  )
}

// Un include con where.clinicaId también filtra la query raíz, siempre que sea
// INNER JOIN (required !== false; con where presente, Sequelize ya lo hace
// required por defecto).
const includeFiltraTenant = (includes, profundidad = 0) => {
  if (!Array.isArray(includes) || profundidad > MAX_PROFUNDIDAD) return false
  return includes.some(
    (inc) =>
      inc &&
      typeof inc === 'object' &&
      ((inc.required !== false && contieneClinicaId(inc.where)) ||
        includeFiltraTenant(inc.include, profundidad + 1))
  )
}

const validarQuery = (modelo, options, operacion, modo) => {
  if (!modelo || !modelo.rawAttributes || !modelo.rawAttributes.clinicaId) return
  if (options && options.sinTenant === true) return
  if (options && (contieneClinicaId(options.where) || includeFiltraTenant(options.include))) return

  const mensaje =
    `TenantGuard: query "${operacion}" sobre ${modelo.name} sin filtro de clinicaId. ` +
    'Agrega clinicaId al where (helper tenantWhere(req) en utils/tenant.js) ' +
    'o marca la query global con { sinTenant: true }.'

  if (modo === 'strict') {
    throw new Error(mensaje)
  }

  logger.error(mensaje)
}

const instalarTenantGuard = (sequelize) => {
  for (const hook of ['beforeFind', 'beforeCount', 'beforeBulkUpdate', 'beforeBulkDestroy']) {
    // function (no arrow): Sequelize invoca los hooks con `this` = modelo, que
    // es la única forma de conocer el modelo en beforeCount (no trae options.model).
    sequelize.addHook(hook, function tenantGuard(options) {
      const modo = resolverModo()
      if (modo === 'off') return
      validarQuery((options && options.model) || this, options, hook, modo)
    })
  }
}

module.exports = { instalarTenantGuard, contieneClinicaId, includeFiltraTenant, resolverModo }
