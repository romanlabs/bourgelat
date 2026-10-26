const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Suscripcion = require('./Suscripcion')
const Clinica = require('./Clinica')
const { TIPOS } = require('../services/recordatoriosCobroReglas')

// Un recordatorio de cobro ya enviado. La clave única (suscripcionId, tipo)
// impide enviar el mismo aviso dos veces a la misma suscripción.
const RecordatorioSuscripcion = sequelize.define('RecordatorioSuscripcion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  suscripcionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Suscripcion, key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
  tipo: {
    type: DataTypes.ENUM(...TIPOS),
    allowNull: false,
  },
  enviadoEn: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  destinatarios: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Cuántos administradores recibieron el correo',
  },
}, {
  tableName: 'recordatorios_suscripcion',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['suscripcionId', 'tipo'], name: 'recordatorios_suscripcion_suscripcion_tipo_uq' },
  ],
})

Suscripcion.hasMany(RecordatorioSuscripcion, { foreignKey: 'suscripcionId' })
RecordatorioSuscripcion.belongsTo(Suscripcion, { foreignKey: 'suscripcionId' })

module.exports = RecordatorioSuscripcion
