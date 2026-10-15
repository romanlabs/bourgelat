const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Usuario = require('./Usuario')

// Código de 6 dígitos para verificar el correo al registrarse. Se guarda solo
// un HMAC, nunca el código en claro. Consultas globales: usar `sinTenant: true`.
const CodigoVerificacionEmail = sequelize.define('CodigoVerificacionEmail', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  codigoHash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  expiracion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  intentos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  usado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'codigos_verificacion_email',
  timestamps: true,
  indexes: [{ fields: ['usuarioId'] }],
})

Usuario.hasMany(CodigoVerificacionEmail, { foreignKey: 'usuarioId' })
CodigoVerificacionEmail.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = CodigoVerificacionEmail
