const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const { DOCUMENTOS_LEGALES } = require('../config/legal')

// Prueba de consentimiento (Ley 1581 de 2012, art. 9: la autorización debe
// poder consultarse posteriormente). Es append-only: una revocatoria o un
// cambio de preferencia se registra como una fila nueva con aceptado=false,
// nunca editando la anterior.
const AceptacionLegal = sequelize.define('AceptacionLegal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  documento: {
    type: DataTypes.ENUM(...DOCUMENTOS_LEGALES),
    allowNull: false,
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Versión del documento vigente al momento de la aceptación',
  },
  aceptado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  origen: {
    type: DataTypes.STRING(40),
    allowNull: false,
    comment: 'Flujo en el que se registró: registro, registro_oauth...',
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
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
}, {
  tableName: 'aceptaciones_legales',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { name: 'aceptaciones_legales_usuario_documento_idx', fields: ['usuarioId', 'documento', 'createdAt'] },
    { name: 'aceptaciones_legales_clinica_idx', fields: ['clinicaId'] },
  ],
})

Usuario.hasMany(AceptacionLegal, { foreignKey: 'usuarioId', as: 'aceptacionesLegales' })
AceptacionLegal.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })

module.exports = AceptacionLegal
