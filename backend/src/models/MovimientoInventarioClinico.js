const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const InsumoClinico = require('./InsumoClinico');
const Usuario = require('./Usuario');
const Clinica = require('./Clinica');

const MovimientoInventarioClinico = sequelize.define('MovimientoInventarioClinico', {
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
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cantidad en unidadBase del insumo',
  },
  stockAnterior: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stockNuevo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  motivo: {
    type: DataTypes.ENUM(
      'inventario_inicial',
      'compra',
      'uso_servicio',
      'uso_procedimiento',
      'ajuste_inventario',
      'vencimiento',
      'devolucion',
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
    comment: 'Snapshot del precioUnitarioBase vigente al momento del movimiento',
  },
  cantidadPresentacion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Solo se llena en motivo=compra: cantidad de la presentacion comprada',
  },
  unidadPresentacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  precioPresentacion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Solo se llena en motivo=compra: precio pagado por esa presentacion',
  },
  insumoClinicoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: InsumoClinico,
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
  facturaId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Factura de venta que origino el consumo (motivo=uso_servicio o su reversion)',
  },
  facturaCompraId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Factura de compra que origino la entrada (motivo=compra o su reversion)',
  },
  servicioClinicoId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Servicio del catalogo que genero el consumo',
  },
  historiaClinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Historia clinica que consumio el insumo (motivo=uso_procedimiento)',
  },
}, {
  tableName: 'movimientos_inventario_clinico',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['insumoClinicoId'] },
    { fields: ['clinicaId', 'createdAt'] },
    { fields: ['motivo'] },
    { fields: ['facturaId'] },
    { fields: ['facturaCompraId'] },
    { fields: ['historiaClinicaId'] },
  ]
});

InsumoClinico.hasMany(MovimientoInventarioClinico, { foreignKey: 'insumoClinicoId', as: 'movimientos' });
MovimientoInventarioClinico.belongsTo(InsumoClinico, { foreignKey: 'insumoClinicoId', as: 'insumo' });
Usuario.hasMany(MovimientoInventarioClinico, { foreignKey: 'usuarioId', as: 'movimientosClinicos' });
MovimientoInventarioClinico.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
Clinica.hasMany(MovimientoInventarioClinico, { foreignKey: 'clinicaId' });
MovimientoInventarioClinico.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = MovimientoInventarioClinico;
