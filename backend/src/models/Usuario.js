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
    allowNull: true, // null para usuarios creados via login social
  },
  proveedorAuth: {
    type: DataTypes.ENUM('local', 'google', 'microsoft'),
    allowNull: false,
    defaultValue: 'local',
  },
  proveedorId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Claim sub del id_token del proveedor OIDC',
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
  foto: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL publica de la foto de perfil (uploads locales)',
  },
  cargo: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Titulo visible al equipo, ej. "Medica veterinaria - cirugia"',
  },
  tarjetaProfesional: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'Numero de tarjeta profesional (solo aplica a veterinarios)',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  emailVerificado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'true para cuentas OAuth (el proveedor ya lo garantiza) y usuarios verificados via email',
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
  indexes: [
  { fields: ['email'], unique: true },
  { fields: ['clinicaId', 'activo'] },
  { fields: ['clinicaId', 'rol'] },
]
});

Clinica.hasMany(Usuario, { foreignKey: 'clinicaId' });
Usuario.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Usuario;