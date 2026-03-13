const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM(
      'superadmin',
      'admin',
      'veterinario',
      'recepcionista',
      'auxiliar',
      'facturador'
    ),
    allowNull: false,
    defaultValue: 'recepcionista',
  },
  rolesAdicionales: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'Roles adicionales para usuarios que desempenan multiples funciones',
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  intentosFallidos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  bloqueadoHasta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ultimoAcceso: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Clinica,
      key: 'id',
    },
    comment: 'Null solo para superadmin',
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
});

Clinica.hasMany(Usuario, { foreignKey: 'clinicaId' });
Usuario.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Usuario;