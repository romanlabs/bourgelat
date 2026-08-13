const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const Consultorio = sequelize.define('Consultorio', {
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
  tableName: 'consultorios',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'activo'] },
    { fields: ['clinicaId', 'nombre'], unique: true },
  ]
});

Clinica.hasMany(Consultorio, { foreignKey: 'clinicaId' });
Consultorio.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Consultorio;
