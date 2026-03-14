const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Producto = require('./Producto');
const Usuario = require('./Usuario');
const Clinica = require('./Clinica');

const MovimientoInventario = sequelize.define('MovimientoInventario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tipo: {
    type: DataTypes.ENUM('entrada', 'salida', 'ajuste'),
    allowNull: false,
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stockAnterior: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stockNuevo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.ENUM(
      'compra',
      'venta',
      'uso_clinico',
      'vencimiento',
      'devolucion',
      'ajuste_inventario',
      'otro'
    ),
    allowNull: false,
  },
  observaciones: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  productoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Producto,
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
  tableName: 'movimientos_inventario',
  timestamps: true,
  updatedAt: false,
});

Producto.hasMany(MovimientoInventario, { foreignKey: 'productoId', as: 'movimientos' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'productoId', as: 'producto' });
Usuario.hasMany(MovimientoInventario, { foreignKey: 'usuarioId', as: 'movimientos' });
MovimientoInventario.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Clinica.hasMany(MovimientoInventario, { foreignKey: 'clinicaId' });
MovimientoInventario.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = MovimientoInventario;