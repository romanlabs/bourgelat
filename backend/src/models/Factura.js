const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');

const Factura = sequelize.define('Factura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numero: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Numero consecutivo de factura por clinica',
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'emitida', 'pagada', 'anulada'),
    allowNull: false,
    defaultValue: 'borrador',
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  descuento: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  impuesto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  metodoPago: {
    type: DataTypes.ENUM(
      'efectivo',
      'tarjeta_debito',
      'tarjeta_credito',
      'transferencia',
      'nequi',
      'daviplata',
      'otro'
    ),
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motivoAnulacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Propietario,
      key: 'id',
    },
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
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
  tableName: 'facturas',
  timestamps: true,
  indexes: [
  { fields: ['clinicaId', 'estado'] },
  { fields: ['clinicaId', 'fecha'] },
  { fields: ['propietarioId'] },
  { fields: ['numero', 'clinicaId'], unique: true },
]
});

Propietario.hasMany(Factura, { foreignKey: 'propietarioId', as: 'facturas' });
Factura.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(Factura, { foreignKey: 'usuarioId', as: 'facturas' });
Factura.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Clinica.hasMany(Factura, { foreignKey: 'clinicaId' });
Factura.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Factura;