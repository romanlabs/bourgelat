const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const Suscripcion = sequelize.define('Suscripcion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  plan: {
    type: DataTypes.ENUM('basico', 'profesional', 'enterprise'),
    allowNull: false,
    defaultValue: 'basico',
  },
  estado: {
    type: DataTypes.ENUM('activa', 'vencida', 'cancelada', 'prueba'),
    allowNull: false,
    defaultValue: 'prueba',
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  metodoPago: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referenciaPago: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Referencia de la transaccion de pago',
  },
  limiteUsuarios: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Null significa ilimitado',
  },
  limiteMascotas: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Null significa ilimitado',
  },
  almacenamientoMB: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Almacenamiento en MB, null significa ilimitado',
  },
  funcionalidades: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Lista de funcionalidades habilitadas segun el plan',
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Clinica,
      key: 'id',
    },
  },
}, {
  tableName: 'suscripciones',
  timestamps: true,
  indexes: [
  { fields: ['clinicaId', 'estado'] },
  { fields: ['fechaFin'] },
  { fields: ['plan'] },
]
});

Clinica.hasMany(Suscripcion, { foreignKey: 'clinicaId', as: 'suscripciones' });
Suscripcion.belongsTo(Clinica, { foreignKey: 'clinicaId', as: 'clinica' });

module.exports = Suscripcion;