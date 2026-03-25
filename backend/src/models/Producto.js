const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  codigoBarras: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Codigo de barras para escaneo rapido en facturacion',
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
    'alimento',
    'accesorio',
    'antiparasitario',
    'suplemento',
    'otro'
  ),
  allowNull: false,
  defaultValue: 'medicamento',
},

subcategoria: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: 'Subcategoria personalizada por la clinica'
},
  unidadMedida: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ml, mg, unidad, caja, frasco, etc',
  },
  precioCompra: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  precioVenta: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  stockMinimo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: 'Cantidad minima antes de generar alerta',
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
  requiereFormula: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si requiere formula medica para dispensar',
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
  tableName: 'productos',
  timestamps: true,
  indexes: [
  { fields: ['clinicaId', 'categoria'] },
  { fields: ['clinicaId', 'activo'] },
  { fields: ['codigoBarras'] },
]
});

Clinica.hasMany(Producto, { foreignKey: 'clinicaId' });
Producto.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Producto;
