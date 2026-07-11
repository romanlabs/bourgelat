'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Propietario = require('./Propietario')
const Usuario = require('./Usuario')
const CajaTurno = require('./CajaTurno')
const { registrarHooksCifrado, aplicarDescifrado } = require('../config/modelEncryption')

const Factura = sequelize.define('Factura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numero: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Numero consecutivo de factura por clinica',
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  estado: {
    // 'parcial': factura a crédito con abonos registrados pero saldo pendiente.
    type: DataTypes.ENUM('borrador', 'emitida', 'parcial', 'pagada', 'anulada'),
    allowNull: false,
    defaultValue: 'borrador',
  },
  // Saldo por cobrar de ventas a crédito (fiado). Denormalizado: se descuenta
  // con cada abono dentro de la misma transacción. 0 = saldada; null = factura
  // histórica anterior al módulo de fiado (se trata como sin saldo).
  saldoPendiente: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  // Los montos no se cifran: son necesarios para SUM/AVG en reportes SQL.
  // El quién pagó y cómo pagó sí se cifra (ver metodoPago y propietarioId en factura).
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  descuento: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  impuesto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  // Cifrado: revela hábitos de pago del cliente.
  // Migrado de ENUM a TEXT para poder almacenar el ciphertext.
  metodoPago: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Cifrado: puede contener notas clínicas o financieras del cliente.
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  motivoAnulacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  proveedorElectronico: {
    type: DataTypes.ENUM('factus'),
    allowNull: true,
  },
  estadoElectronico: {
    type: DataTypes.ENUM('no_aplica', 'pendiente', 'enviada', 'validada', 'rechazada', 'error'),
    allowNull: false,
    defaultValue: 'no_aplica',
  },
  documentoElectronico: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Codigo de documento del proveedor, ej. 01 factura de venta',
  },
  rangoNumeracionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  referenciaExterna: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID o referencia devuelta por el proveedor de facturacion electronica',
  },
  cufe: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fechaEnvioElectronico: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fechaValidacionElectronica: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  urlPdfElectronico: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  urlXmlElectronico: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Cifrado: mensaje de estado del proveedor electrónico (puede contener PII).
  mensajeElectronico: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Cifrado: payload completo enviado a la DIAN vía Factus (contiene datos del cliente).
  // Migrado de JSONB a TEXT para almacenar ciphertext; los hooks reconstituyen el objeto.
  payloadElectronico: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Cifrado: respuesta cruda de la DIAN/Factus (puede contener datos fiscales sensibles).
  respuestaElectronica: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Nullable: ventas de mostrador sin cliente asociado.
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Propietario,
      key: 'id',
    },
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Clinica,
      key: 'id',
    },
  },
  // Nullable a nivel de modelo (facturas históricas no lo tienen), pero
  // obligatorio a nivel de controlador para facturas nuevas (ver crearFactura).
  cajaTurnoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: CajaTurno,
      key: 'id',
    },
  },
}, {
  tableName: 'facturas',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'estado'] },
    { fields: ['clinicaId', 'fecha'] },
    { fields: ['propietarioId'] },
    { fields: ['numero', 'clinicaId'], unique: true },
    { fields: ['cajaTurnoId'] },
  ],
})

registrarHooksCifrado(Factura, {
  campos:     ['metodoPago', 'observaciones', 'mensajeElectronico'],
  camposJson: ['payloadElectronico', 'respuestaElectronica'],
})

Propietario.hasMany(Factura, { foreignKey: 'propietarioId', as: 'facturas' })
Factura.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' })
Usuario.hasMany(Factura, { foreignKey: 'usuarioId', as: 'facturas' })
Factura.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })
Clinica.hasMany(Factura, { foreignKey: 'clinicaId' })
Factura.belongsTo(Clinica, { foreignKey: 'clinicaId' })
CajaTurno.hasMany(Factura, { foreignKey: 'cajaTurnoId', as: 'facturas' })
Factura.belongsTo(CajaTurno, { foreignKey: 'cajaTurnoId', as: 'cajaTurno' })

Factura.addHook('afterFind', (resultado) => {
  if (!resultado) return
  const descifrar = (inst) => {
    const prop = inst?.dataValues?.propietario
    if (prop) aplicarDescifrado({ instance: prop, ...Propietario.CIFRADO })
  }
  Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
})

module.exports = Factura
