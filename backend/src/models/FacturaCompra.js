const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Usuario = require('./Usuario');

const FacturaCompra = sequelize.define('FacturaCompra', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numero: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  proveedor: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('borrador', 'confirmada', 'anulada'),
    allowNull: false,
    defaultValue: 'borrador',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  fechaPagoFinal: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  pagada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  fechaPago: {
    type: DataTypes.DATEONLY,
    allowNull: true,
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
}, {
  tableName: 'facturas_compra',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'estado'] },
    { fields: ['clinicaId', 'fecha'] },
  ],
});

Clinica.hasMany(FacturaCompra, { foreignKey: 'clinicaId' });
FacturaCompra.belongsTo(Clinica, { foreignKey: 'clinicaId' });
Usuario.hasMany(FacturaCompra, { foreignKey: 'usuarioId' });
FacturaCompra.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

module.exports = FacturaCompra;
