'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const { registrarHooksCifrado } = require('../config/modelEncryption')

const CajaTurno = sequelize.define('CajaTurno', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  estado: {
    type: DataTypes.ENUM('abierto', 'cerrado'),
    allowNull: false,
    defaultValue: 'abierto',
  },
  montoInicial: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  // Contador denormalizado: se incrementa dentro de la misma transacción de
  // crearFactura cuando metodoPago === 'efectivo'. Factura.metodoPago está
  // cifrado a nivel de campo, por lo que no es agregable con SQL directo.
  totalVentasEfectivo: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalIngresosManuales: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalEgresosManuales: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  montoFinalEsperado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  montoFinalContado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  diferencia: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  categoriaDiferencia: {
    type: DataTypes.ENUM(
      'error_vuelto',
      'gasto_no_registrado',
      'redondeo',
      'pago_no_registrado',
      'causa_desconocida',
      'otro'
    ),
    allowNull: true,
  },
  // Cifrado: puede contener explicaciones operativas sensibles.
  observacionesCierre: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  requiereRevisionAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  fechaApertura: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  fechaCierre: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'caja_turnos',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'estado'] },
    { fields: ['clinicaId', 'usuarioId', 'estado'] },
    { fields: ['clinicaId', 'fechaApertura'] },
  ],
})

registrarHooksCifrado(CajaTurno, {
  campos: ['observacionesCierre'],
})

Usuario.hasMany(CajaTurno, { foreignKey: 'usuarioId', as: 'turnosCaja' })
CajaTurno.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })
Clinica.hasMany(CajaTurno, { foreignKey: 'clinicaId' })
CajaTurno.belongsTo(Clinica, { foreignKey: 'clinicaId' })

module.exports = CajaTurno
