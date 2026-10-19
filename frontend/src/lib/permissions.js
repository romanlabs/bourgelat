export const getUserRoles = (usuario) => [
  usuario?.rol,
  ...(Array.isArray(usuario?.rolesAdicionales) ? usuario.rolesAdicionales : []),
].filter(Boolean)

export const hasRole = (usuario, rol) => getUserRoles(usuario).includes(rol)

export const hasAnyRole = (usuario, roles = []) => {
  const userRoles = getUserRoles(usuario)
  return roles.some((rol) => userRoles.includes(rol))
}

// Fuente única de qué roles entran a cada módulo. Un módulo que no aparece
// aquí es accesible para cualquier usuario autenticado (dashboard, planes).
// El backend sigue validando con `verificarRol`; esto solo gobierna la UI.
export const MODULE_ACCESS = {
  agenda: ['admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'],
  pacientes: ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'],
  historias: ['admin', 'superadmin', 'veterinario', 'auxiliar'],
  antecedentes: ['admin', 'superadmin', 'veterinario', 'auxiliar'],
  // Caja: el turno solo lo abren estos roles (cajaRoutes), y sin turno no se vende.
  caja: ['admin', 'superadmin', 'recepcionista', 'facturador'],
  // Finanzas: reporte de ingresos (admin, facturador) y gastos (admin).
  finanzas: ['admin', 'superadmin', 'facturador'],
  inventario: ['admin', 'superadmin', 'auxiliar'],
  usuarios: ['admin', 'superadmin'],
  configuracion: ['admin', 'superadmin'],
  auditoria: ['admin', 'superadmin'],
  // Igual que rolesClinica en backend/src/routes/soporteRoutes.js: todo el equipo
  // abre tickets (cada quien ve los suyos; el admin, los de toda la clínica).
  soporte: ['admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador'],
}

export const canAccessModule = (usuario, moduleKey) => {
  const roles = MODULE_ACCESS[moduleKey]
  return !roles || hasAnyRole(usuario, roles)
}

// Módulo → clave, a partir de la ruta (`/inventario`, `/pacientes/:id/historial`).
export const moduleKeyFromPath = (pathname = '') => {
  const segment = pathname.split('/')[1]
  return segment && segment in MODULE_ACCESS ? segment : null
}
