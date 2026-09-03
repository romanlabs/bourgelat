const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const FacturaCompra = require('./FacturaCompra');
const Producto = require('./Producto');
const InsumoClinico = require('./InsumoClinico');

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
  destinoInventario: {
    type: DataTypes.ENUM('ventas', 'clinico'),
    allowNull: false,
    defaultValue: 'ventas',
    comment: 'Inventario que abastece este item: productos de venta o insumos clinicos',
  },
  // Exactamente uno de productoId / insumoClinicoId se llena, segun el
  // destino. La coherencia la garantiza el CHECK factura_compra_items_destino_ref_chk.
  productoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Producto, key: 'id' },
  },
  insumoClinicoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: InsumoClinico, key: 'id' },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'En destino clinico son presentaciones compradas, no unidades base',
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
    { fields: ['insumoClinicoId'] },
  ],
});

FacturaCompra.hasMany(FacturaCompraItem, { foreignKey: 'facturaCompraId', as: 'items' });
FacturaCompraItem.belongsTo(FacturaCompra, { foreignKey: 'facturaCompraId' });
Producto.hasMany(FacturaCompraItem, { foreignKey: 'productoId' });
FacturaCompraItem.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });
InsumoClinico.hasMany(FacturaCompraItem, { foreignKey: 'insumoClinicoId' });
FacturaCompraItem.belongsTo(InsumoClinico, { foreignKey: 'insumoClinicoId', as: 'insumoClinico' });

module.exports = FacturaCompraItem;
