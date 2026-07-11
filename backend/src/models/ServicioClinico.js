const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const ServicioClinico = sequelize.define('ServicioClinico', {
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
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Categoria libre definida por la clinica (ej. consulta, cirugia, laboratorio)',
  },
  precioVenta: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
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
  tableName: 'servicios_clinicos',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'activo'] },
  ]
});

Clinica.hasMany(ServicioClinico, { foreignKey: 'clinicaId' });
ServicioClinico.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = ServicioClinico;
