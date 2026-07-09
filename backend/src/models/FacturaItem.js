'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Factura = require('./Factura')
const Producto = require('./Producto')
const ServicioClinico = require('./ServicioClinico')
const { registrarHooksCifrado } = require('../config/modelEncryption')

const FacturaItem = sequelize.define('FacturaItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Cifrado: revela qué servicios o medicamentos consume el cliente.
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('producto', 'servicio'),
    allowNull: false,
    defaultValue: 'servicio',
  },
  // Los precios no se cifran: necesarios para recalcular totales y reportes.
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
  servicioClinicoId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Servicio del catalogo clinico facturado, cuando tipo=servicio',
    references: {
      model: ServicioClinico,
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
    { fields: ['servicioClinicoId'] },
  ],
})

registrarHooksCifrado(FacturaItem, {
  campos: ['descripcion'],
})

Factura.hasMany(FacturaItem, { foreignKey: 'facturaId', as: 'items' })
FacturaItem.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' })
Producto.hasMany(FacturaItem, { foreignKey: 'productoId', as: 'itemsFactura' })
FacturaItem.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' })
ServicioClinico.hasMany(FacturaItem, { foreignKey: 'servicioClinicoId', as: 'itemsFactura' })
FacturaItem.belongsTo(ServicioClinico, { foreignKey: 'servicioClinicoId', as: 'servicioClinico' })

module.exports = FacturaItem
