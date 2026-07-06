'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const Factura = require('./Factura')
const CajaTurno = require('./CajaTurno')
const { registrarHooksCifrado } = require('../config/modelEncryption')

// Abono parcial a una factura vendida a crédito (fiado). Libro inmutable:
// los abonos no se editan ni se borran. El saldo vive denormalizado en
// Factura.saldoPendiente (Factura.metodoPago y este metodoPago están cifrados,
// así que no son agregables por SQL — mismo patrón de contadores que CajaTurno).
const AbonoFactura = sequelize.define('AbonoFactura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // No se cifra: necesario para validar y reconstruir saldos.
  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  // Cifrado: revela hábitos de pago del cliente (mismo criterio que Factura).
  metodoPago: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Cifrado: nota libre sobre el abono.
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  facturaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Factura,
      key: 'id',
    },
  },
  // Turno de caja del cobrador cuando el abono fue en efectivo (nullable:
  // abonos por transferencia o sin turno abierto no tocan la caja).
  cajaTurnoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: CajaTurno,
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
}, {
  tableName: 'abonos_factura',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['facturaId'] },
    { fields: ['clinicaId', 'createdAt'] },
    { fields: ['cajaTurnoId'] },
  ],
})

registrarHooksCifrado(AbonoFactura, {
  campos: ['metodoPago', 'observaciones'],
})

Factura.hasMany(AbonoFactura, { foreignKey: 'facturaId', as: 'abonos' })
AbonoFactura.belongsTo(Factura, { foreignKey: 'facturaId', as: 'factura' })
Usuario.hasMany(AbonoFactura, { foreignKey: 'usuarioId', as: 'abonosRegistrados' })
AbonoFactura.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })
CajaTurno.hasMany(AbonoFactura, { foreignKey: 'cajaTurnoId', as: 'abonos' })
AbonoFactura.belongsTo(CajaTurno, { foreignKey: 'cajaTurnoId', as: 'cajaTurno' })
Clinica.hasMany(AbonoFactura, { foreignKey: 'clinicaId' })
AbonoFactura.belongsTo(Clinica, { foreignKey: 'clinicaId' })

module.exports = AbonoFactura
