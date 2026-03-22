const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const Propietario = sequelize.define('Propietario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipoDocumento: {
    type: DataTypes.ENUM('CC', 'CE', 'NIT', 'PP'),
    allowNull: false,
    defaultValue: 'CC',
  },
  numeroDocumento: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ciudad: {
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
  tableName: 'propietarios',
  timestamps: true,
  indexes: [
  { fields: ['numeroDocumento', 'clinicaId'], unique: true },
  { fields: ['clinicaId', 'activo'] },
  { fields: ['telefono'] },
],
});

Clinica.hasMany(Propietario, { foreignKey: 'clinicaId' });
Propietario.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Propietario;