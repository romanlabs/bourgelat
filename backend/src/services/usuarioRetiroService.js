const { QueryTypes } = require('sequelize')

// Sacar a alguien del equipo sin dejar huecos. Borrar la fila de un usuario con
// actividad no es seguro: según cómo se creó la base, varias llaves hacia
// `usuarios` están en CASCADE (historias, citas, facturas) y se irían con él.
// Por eso solo se borra quien no aparece en ninguna tabla; a los demás se les
// retira: sin acceso ni datos de contacto, pero con el nombre para saber quién
// hizo cada cosa.

// Tablas que solo guardan credenciales o trámites de acceso: no son actividad.
const TABLAS_DE_ACCESO = [
  'invitaciones_usuario',
  'password_reset_tokens',
  'email_verification_tokens',
  'codigos_verificacion_email',
  'refresh_tokens',
]

const dominioRetirados = 'usuarios-retirados.bourgelat.invalid'
const emailRetirado = (usuarioId) => `retirado-${usuarioId}@${dominioRetirados}`

const columnasQueReferencianUsuarios = async (transaction) => {
  const sequelize = require('../config/database')
  const filas = await sequelize.query(
    `SELECT DISTINCT kcu.table_name AS tabla, kcu.column_name AS columna
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.constraint_name
      WHERE ccu.table_name = 'usuarios' AND ccu.column_name = 'id' AND kcu.table_schema = 'public'`,
    { type: QueryTypes.SELECT, transaction }
  )
  const columnas = filas.filter(({ tabla }) => !TABLAS_DE_ACCESO.includes(tabla))
  // La auditoría guarda el usuarioId sin llave foránea.
  if (!columnas.some(({ tabla }) => tabla === 'auditoria_logs')) {
    columnas.push({ tabla: 'auditoria_logs', columna: 'usuarioId' })
  }
  return columnas
}

// true si el usuario aparece en cualquier tabla que no sea de acceso.
const tieneActividad = async (usuarioId, { transaction } = {}) => {
  const sequelize = require('../config/database')
  const columnas = await columnasQueReferencianUsuarios(transaction)
  const condiciones = columnas.map(
    ({ tabla, columna }) => `EXISTS (SELECT 1 FROM "${tabla}" WHERE "${columna}" = :usuarioId)`
  )
  const [fila] = await sequelize.query(`SELECT (${condiciones.join(' OR ')}) AS "tieneActividad"`, {
    type: QueryTypes.SELECT,
    replacements: { usuarioId },
    transaction,
  })
  return Boolean(fila?.tieneActividad)
}

// Retira al usuario: no vuelve a entrar (sin clave, sin proveedor, correo
// liberado) y deja de aparecer en el equipo. El correo queda libre para que la
// persona pueda volver a ser invitada o registrarse en otra clínica.
const retirarUsuario = async (usuario, { transaction } = {}) => {
  const RefreshToken = require('../models/RefreshToken')
  const PasswordResetToken = require('../models/PasswordResetToken')
  const { invalidarInvitaciones } = require('./invitacionService')

  await usuario.update(
    {
      activo: false,
      retiradoEn: new Date(),
      email: emailRetirado(usuario.id),
      password: null,
      proveedorId: null,
      telefono: null,
      foto: null,
      rolesAdicionales: [],
    },
    { transaction }
  )
  const opciones = { where: { usuarioId: usuario.id }, transaction, sinTenant: true }
  await RefreshToken.destroy(opciones)
  await PasswordResetToken.destroy(opciones)
  await invalidarInvitaciones(usuario.id, { transaction })
}

module.exports = {
  TABLAS_DE_ACCESO,
  emailRetirado,
  tieneActividad,
  retirarUsuario,
}
