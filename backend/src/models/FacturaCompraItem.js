const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FacturaCompra = require('./FacturaCompra');
const Producto = require('./Producto');

const FacturaCompraItem = sequelize.define('FacturaCompraItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  facturaCompraId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: FacturaCompra, key: 'id' },
  },
  productoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Producto, key: 'id' },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'factura_compra_items',
  timestamps: true,
  indexes: [
    { fields: ['facturaCompraId'] },
  ],
});

FacturaCompra.hasMany(FacturaCompraItem, { foreignKey: 'facturaCompraId', as: 'items' });
FacturaCompraItem.belongsTo(FacturaCompra, { foreignKey: 'facturaCompraId' });
Producto.hasMany(FacturaCompraItem, { foreignKey: 'productoId' });
FacturaCompraItem.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });

module.exports = FacturaCompraItem;
