const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const AuditoriaLog = sequelize.define('AuditoriaLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  accion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Ej: LOGIN, CREAR_CITA, ELIMINAR_PRODUCTO',
  },
  entidad: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Ej: Cita, Factura, Usuario',
  },
  entidadId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID del registro afectado',
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  datosAnteriores: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Estado antes del cambio',
  },
  datosNuevos: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Estado después del cambio',
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resultado: {
    type: DataTypes.ENUM('exitoso', 'fallido'),
    defaultValue: 'exitoso',
  },
}, {
  tableName: 'auditoria_logs',
  timestamps: true,
  updatedAt: false,
  indexes: [
  { fields: ['clinicaId', 'createdAt'] },
  { fields: ['accion'] },
  { fields: ['entidad', 'entidadId'] },
  { fields: ['resultado'] },
]
})

module.exports = AuditoriaLog