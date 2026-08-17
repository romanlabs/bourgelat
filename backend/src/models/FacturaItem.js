'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Factura = require('./Factura')
const Producto = require('./Producto')
const ServicioClinico = require('./ServicioClinico')
const InsumoClinico = require('./InsumoClinico')
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
    // 'insumo': insumo clinico ya consumido en la historia. Se cobra, pero no
    // vuelve a descontar stock — el descuento ocurrio al bloquear la historia.
    type: DataTypes.ENUM('producto', 'servicio', 'insumo'),
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
  insumoClinicoId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Insumo clinico facturado como linea propia, cuando tipo=insumo',
    references: {
      model: InsumoClinico,
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
    { fields: ['insumoClinicoId'] },
  ],
})

// Exportado para que modelos padre puedan descifrar instancias anidadas.
// Sequelize v6 no dispara afterFind del modelo hijo cuando se carga vía include.
const CIFRADO_FACTURA_ITEM = {
  campos: ['descripcion'],
}

registrarHooksCifrado(FacturaItem, CIFRADO_FACTURA_ITEM)

Factura.hasMany(FacturaItem, { foreignKey: 'facturaId', as: 'items' })
FacturaItem.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' })
Producto.hasMany(FacturaItem, { foreignKey: 'productoId', as: 'itemsFactura' })
FacturaItem.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' })
ServicioClinico.hasMany(FacturaItem, { foreignKey: 'servicioClinicoId', as: 'itemsFactura' })
FacturaItem.belongsTo(ServicioClinico, { foreignKey: 'servicioClinicoId', as: 'servicioClinico' })
InsumoClinico.hasMany(FacturaItem, { foreignKey: 'insumoClinicoId', as: 'itemsFactura' })
FacturaItem.belongsTo(InsumoClinico, { foreignKey: 'insumoClinicoId', as: 'insumoClinico' })

module.exports = FacturaItem
module.exports.CIFRADO = CIFRADO_FACTURA_ITEM
