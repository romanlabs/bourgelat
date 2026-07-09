// Helper para construir el where de queries scoped al tenant del usuario
// autenticado. Lanza si el contexto no tiene clinicaId (p. ej. superadmin
// global), para que el error sea explícito en vez de filtrar por undefined.
//
// Uso en controladores:
//   const mascotas = await Mascota.findAll({ where: tenantWhere(req, { activo: true }) })
//
// El tenantGuard (config/tenantGuard.js) rechaza toda query sobre modelos con
// clinicaId que no filtre por tenant; las queries globales legítimas se marcan
// con { sinTenant: true }.

const tenantWhere = (req, extra = {}) => {
  const clinicaId = req?.usuario?.clinicaId

  if (!clinicaId) {
    throw new Error(
      'tenantWhere: el usuario autenticado no tiene clinicaId; si la query es global (superadmin), usa { sinTenant: true } explícito'
    )
  }

  return { clinicaId, ...extra }
}

module.exports = { tenantWhere }
