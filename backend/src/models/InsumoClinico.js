const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const InsumoClinico = sequelize.define('InsumoClinico', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  categoria: {
    type: DataTypes.ENUM(
      'medicamento',
      'vacuna',
      'insumo',
      'antiparasitario',
      'suplemento',
      'otro'
    ),
    allowNull: false,
    defaultValue: 'insumo',
  },
  unidadBase: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Unidad en la que se lleva el stock y se consume: ml, mg, gr, unidad, dosis, etc',
  },
  cantidadPresentacion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cantidad total de unidadBase que trae la presentacion comprada (ej. 100 ml por frasco)',
  },
  unidadPresentacion: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre de la presentacion de referencia (ej. frasco, caja), solo informativo',
  },
  precioPresentacion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Precio pagado por la presentacion completa en la ultima compra registrada',
  },
  precioUnitarioBase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Costo por unidad base, calculado como costo promedio ponderado',
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Existencia actual en unidadBase (ej. ml restantes)',
  },
  stockMinimo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Cantidad minima en unidadBase antes de generar alerta',
  },
  fechaVencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  lote: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  laboratorio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'insumos_clinicos',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'categoria'] },
    { fields: ['clinicaId', 'activo'] },
  ]
});

Clinica.hasMany(InsumoClinico, { foreignKey: 'clinicaId' });
InsumoClinico.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = InsumoClinico;
