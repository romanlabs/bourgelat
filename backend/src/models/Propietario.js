'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const { registrarHooksCifrado } = require('../config/modelEncryption')

const Propietario = sequelize.define('Propietario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tipoDocumento: {
    type: DataTypes.ENUM('CC', 'CE', 'NIT', 'PP'),
    allowNull: false,
    defaultValue: 'CC',
  },
  numeroDocumento: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // HMAC-SHA256 del numeroDocumento en texto plano.
  // Permite búsquedas por igualdad y el índice único sin exponer el valor real.
  // Se actualiza automáticamente vía beforeCreate/beforeUpdate.
  numeroDocumentoHash: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  email: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ciudad: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razonSocial: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  nombreComercial: {
    type: DataTypes.TEXT,
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
    // Índice único sobre el hash en lugar del valor cifrado (no comparable directamente).
    // Para buscar por documento: WHERE "numeroDocumentoHash" = hmacTexto(input) AND "clinicaId" = ?
    { fields: ['numeroDocumentoHash', 'clinicaId'], unique: true, name: 'propietarios_doc_hash_clinica_unique' },
    { fields: ['clinicaId', 'activo'] },
    { fields: ['telefono'] },
  ],
})

registrarHooksCifrado(Propietario, {
  campos:     ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial'],
  hashConfig: { fuente: 'numeroDocumento', destino: 'numeroDocumentoHash' },
})

Clinica.hasMany(Propietario, { foreignKey: 'clinicaId' })
Propietario.belongsTo(Clinica, { foreignKey: 'clinicaId' })

module.exports = Propietario
