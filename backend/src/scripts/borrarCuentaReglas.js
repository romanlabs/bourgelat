// Decisión pura de si una clínica se puede borrar con `npm run cuenta:borrar`.
// Solo se borran cuentas que nunca se usaron (pruebas, registros abandonados o
// de bots): lo único permitido es lo que deja un registro recién hecho.

// Tablas con clinicaId que un registro crea o que no son datos de la clínica.
const TABLAS_PERMITIDAS = new Set([
  'usuarios',
  'suscripciones',
  'aceptaciones_legales',
  'auditoria_logs',
  'refresh_tokens',
  'consultorios',
  // Enlaces de invitación: no son datos clínicos y caen en cascada con el usuario.
  'invitaciones_usuario',
])

/**
 * @param {{ conteos: Record<string, number>, usuarios: Array<{ email: string }>, emailsPedidos: string[] }} datos
 * @returns {{ puede: boolean, motivos: string[] }}
 */
const evaluarBorrado = ({ conteos, usuarios, emailsPedidos }) => {
  const motivos = []

  for (const [tabla, total] of Object.entries(conteos)) {
    if (total > 0 && !TABLAS_PERMITIDAS.has(tabla)) {
      motivos.push(`tiene ${total} registro(s) en ${tabla}`)
    }
  }

  const pedidos = new Set(emailsPedidos.map((email) => email.toLowerCase()))
  const ajenos = usuarios.filter((usuario) => !pedidos.has(String(usuario.email).toLowerCase()))
  if (ajenos.length > 0) {
    motivos.push(`tiene otros usuarios: ${ajenos.map((usuario) => usuario.email).join(', ')}`)
  }

  return { puede: motivos.length === 0, motivos }
}

module.exports = { TABLAS_PERMITIDAS, evaluarBorrado }
