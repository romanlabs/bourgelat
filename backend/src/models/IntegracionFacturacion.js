const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')

const IntegracionFacturacion = sequelize.define('IntegracionFacturacion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  proveedor: {
    type: DataTypes.ENUM('factus'),
    allowNull: false,
    defaultValue: 'factus',
  },
  ambiente: {
    type: DataTypes.ENUM('sandbox', 'production'),
    allowNull: false,
    defaultValue: 'sandbox',
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  baseUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Permite sobreescribir la URL base del proveedor si cambia por ambiente o cuenta',
  },
  clientIdCifrado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  clientSecretCifrado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  usernameCifrado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  passwordCifrado: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rangoNumeracionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  documentoCodigo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '01',
  },
  formaPagoCodigo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1',
    comment: 'payment_form en Factus',
  },
  metodoPagoCodigo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '10',
    comment: 'payment_method_code en Factus',
  },
  enviarEmail: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  configuracionAdicional: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  ultimoChequeo: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ultimoEstadoChequeo: {
    type: DataTypes.ENUM('pendiente', 'exitoso', 'fallido'),
    allowNull: false,
    defaultValue: 'pendiente',
  },
  ultimoMensajeChequeo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: Clinica,
      key: 'id',
    },
  },
}, {
  tableName: 'integraciones_facturacion',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId'], unique: true },
    { fields: ['proveedor', 'activa'] },
  ],
})

Clinica.hasOne(IntegracionFacturacion, { foreignKey: 'clinicaId', as: 'integracionFacturacion' })
IntegracionFacturacion.belongsTo(Clinica, { foreignKey: 'clinicaId', as: 'clinica' })

module.exports = IntegracionFacturacion
