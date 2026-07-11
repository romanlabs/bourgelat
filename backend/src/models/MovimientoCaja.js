'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const CajaTurno = require('./CajaTurno')
const { registrarHooksCifrado } = require('../config/modelEncryption')

const MovimientoCaja = sequelize.define('MovimientoCaja', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tipo: {
    type: DataTypes.ENUM('ingreso', 'egreso'),
    allowNull: false,
  },
  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  motivo: {
    type: DataTypes.ENUM(
      'fondo_adicional',
      'retiro_domicilio',
      'gasto_menor',
      'pago_proveedor',
      'prestamo_caja_chica',
      // Generado por el sistema al registrar un Gasto del negocio pagado en
      // efectivo con turno abierto. No se acepta desde la API de movimientos
      // manuales (ver MOTIVOS_MOVIMIENTO_CAJA en cajaRoutes).
      'gasto_negocio',
      'otro'
    ),
    allowNull: false,
  },
  // Cifrado: nota libre, puede contener info operativa sensible.
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  cajaTurnoId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  tableName: 'movimientos_caja',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['cajaTurnoId'] },
    { fields: ['clinicaId', 'createdAt'] },
  ],
})

registrarHooksCifrado(MovimientoCaja, {
  campos: ['observaciones'],
})

CajaTurno.hasMany(MovimientoCaja, { foreignKey: 'cajaTurnoId', as: 'movimientos' })
MovimientoCaja.belongsTo(CajaTurno, { foreignKey: 'cajaTurnoId', as: 'turno' })
Usuario.hasMany(MovimientoCaja, { foreignKey: 'usuarioId', as: 'movimientosCaja' })
MovimientoCaja.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })
Clinica.hasMany(MovimientoCaja, { foreignKey: 'clinicaId' })
MovimientoCaja.belongsTo(Clinica, { foreignKey: 'clinicaId' })

module.exports = MovimientoCaja
