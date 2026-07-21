const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Usuario = require('./Usuario')

// Guarda el hash SHA-256 del token, nunca el token en claro: mismo patron que
// PasswordResetToken, para que una fuga de la tabla no sirva para verificar
// correos ajenos.
const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
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
  tableName: 'email_verification_tokens',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['usuarioId'] },
    { fields: ['expiracion'] },
  ],
})

Usuario.hasMany(EmailVerificationToken, { foreignKey: 'usuarioId' })
EmailVerificationToken.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = EmailVerificationToken
