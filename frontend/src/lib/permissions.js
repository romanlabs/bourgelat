export const getUserRoles = (usuario) => [
  usuario?.rol,
  ...(Array.isArray(usuario?.rolesAdicionales) ? usuario.rolesAdicionales : []),
].filter(Boolean)

export const hasRole = (usuario, rol) => getUserRoles(usuario).includes(rol)

export const hasAnyRole = (usuario, roles = []) => {
  const userRoles = getUserRoles(usuario)
  return roles.some((rol) => userRoles.includes(rol))
}
