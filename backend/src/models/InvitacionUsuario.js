const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Usuario = require('./Usuario')
const Clinica = require('./Clinica')

// Enlace de un solo uso con el que un usuario invitado crea su propia
// contraseña. Como PasswordResetToken, guarda el hash SHA-256 del token y nunca
// el token en claro. Las filas viven al menos 24 h aunque estén usadas: los
// topes diarios de invitaciones (invitacionService) cuentan estas filas.
const InvitacionUsuario = sequelize.define('InvitacionUsuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  expiracion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  usado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
  creadoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Administrador que envió la invitación (sin FK: puede borrarse después)',
  },
}, {
  tableName: 'invitaciones_usuario',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['usuarioId'] },
    { fields: ['clinicaId', 'createdAt'] },
    { fields: ['expiracion'] },
  ],
})

Usuario.hasMany(InvitacionUsuario, { foreignKey: 'usuarioId' })
InvitacionUsuario.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = InvitacionUsuario
