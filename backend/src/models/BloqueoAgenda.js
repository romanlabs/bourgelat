const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Usuario = require('./Usuario');

const BloqueoAgenda = sequelize.define('BloqueoAgenda', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Null junto con horaFin significa dia(s) completo(s)',
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Clinica,
      key: 'id',
    },
  },
  creadoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, {
  tableName: 'bloqueos_agenda',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'fechaInicio', 'fechaFin'] },
  ]
});

Clinica.hasMany(BloqueoAgenda, { foreignKey: 'clinicaId' });
BloqueoAgenda.belongsTo(Clinica, { foreignKey: 'clinicaId' });
BloqueoAgenda.belongsTo(Usuario, { foreignKey: 'creadoPorId', as: 'creadoPor' });

module.exports = BloqueoAgenda;
