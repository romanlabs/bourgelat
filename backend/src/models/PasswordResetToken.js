const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Usuario = require('./Usuario')

// Guarda el hash SHA-256 del token, nunca el token en claro: si la tabla se
// filtra, los hashes no sirven para restablecer contraseñas.
const PasswordResetToken = sequelize.define('PasswordResetToken', {
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
    defaultValue: false,
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
}, {
  tableName: 'password_reset_tokens',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['usuarioId'] },
    { fields: ['expiracion'] },
  ],
})

Usuario.hasMany(PasswordResetToken, { foreignKey: 'usuarioId' })
PasswordResetToken.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = PasswordResetToken
