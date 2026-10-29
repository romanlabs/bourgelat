const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const { CATEGORIAS } = require('../services/notificacionReglas')

// Un aviso de la campanita para un usuario. Se crea desde
// services/notificacionService.js; la tabla la crea la migración
// 20261029_000002_notificaciones.
const Notificacion = sequelize.define('Notificacion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  categoria: {
    type: DataTypes.ENUM(...CATEGORIAS),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  titulo: {
    type: DataTypes.STRING(160),
    allowNull: false,
  },
  texto: {
    type: DataTypes.STRING(400),
    allowNull: true,
  },
  enlace: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Ruta de la app a la que lleva el aviso, ej. /agenda',
  },
  entidadTipo: {
    type: DataTypes.STRING(40),
    allowNull: true,
  },
  entidadId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  leidaEn: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notificaciones',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['usuarioId', 'createdAt'], name: 'notificaciones_usuario_fecha_idx' },
    { fields: ['clinicaId'], name: 'notificaciones_clinica_idx' },
  ],
})

Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId' })
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId' })

module.exports = Notificacion
