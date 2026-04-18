const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Clinica = sequelize.define('Clinica', {
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
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ciudad: {
  type: DataTypes.STRING,
  allowNull: true,
  },
  departamento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nit: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  razonSocial: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nombreComercial: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tipoPersona: {
    type: DataTypes.ENUM('persona_natural', 'persona_juridica'),
    allowNull: false,
    defaultValue: 'persona_juridica',
  },
  digitoVerificacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  codigoPostal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  municipioId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID de municipio segun tablas de referencia DIAN/Factus',
  },
  tipoDocumentoFacturacionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID de tipo de documento en tablas de referencia del proveedor',
  },
  organizacionJuridicaId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Equivale a legal_organization_id en Factus',
  },
  tributoId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Equivale a tribute_id en Factus',
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL del logo en Cloudinary',
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
}, {
  tableName: 'clinicas',
  timestamps: true,
  indexes: [
  { fields: ['email'], unique: true },
  { fields: ['nit'], unique: true },
  { fields: ['activo'] },
]
});

module.exports = Clinica;
