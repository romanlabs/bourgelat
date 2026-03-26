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
    defaultValue: 'persona_natural',
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
