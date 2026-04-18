const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },
  expiracion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revocado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Puede ser de una clínica o de un usuario
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Clinica, key: 'id' },
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Usuario, key: 'id' },
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  updatedAt: false,
  indexes: [
  { fields: ['token'] },
  { fields: ['clinicaId'] },
  { fields: ['expiracion'] },
  { fields: ['revocado'] },
]
})

Clinica.hasMany(RefreshToken, { foreignKey: 'clinicaId' })
RefreshToken.belongsTo(Clinica, { foreignKey: 'clinicaId' })
Usuario.hasMany(RefreshToken, { foreignKey: 'usuarioId' })
RefreshToken.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = RefreshToken
