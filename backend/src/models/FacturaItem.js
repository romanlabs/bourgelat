const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Factura = require('./Factura');
const Producto = require('./Producto');

const FacturaItem = sequelize.define('FacturaItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('producto', 'servicio'),
    allowNull: false,
    defaultValue: 'servicio',
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  descuento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  productoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Producto,
      key: 'id',
    },
  },
  facturaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Factura,
      key: 'id',
    },
  },
}, {
  tableName: 'factura_items',
  timestamps: true,
  updatedAt: false,
  indexes: [
  { fields: ['facturaId'] },
  { fields: ['productoId'] },
]
});

Factura.hasMany(FacturaItem, { foreignKey: 'facturaId', as: 'items' });
FacturaItem.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' });
Producto.hasMany(FacturaItem, { foreignKey: 'productoId', as: 'itemsFactura' });
FacturaItem.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

module.exports = FacturaItem;