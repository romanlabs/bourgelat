'use strict'

const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')
const CajaTurno = require('./CajaTurno')
const MovimientoCaja = require('./MovimientoCaja')
const HistoriaClinica = require('./HistoriaClinica')
const { registrarHooksCifrado } = require('../config/modelEncryption')

// Gasto del negocio (nómina, arriendo, servicios...). Distinto de MovimientoCaja:
// un gasto puede pagarse por transferencia (nunca toca la caja) o en efectivo
// (genera automáticamente un MovimientoCaja egreso en el turno abierto).
// Es un libro inmutable: los gastos se anulan, no se editan ni se borran,
// para que el reporte de rentabilidad sea auditable.
//
// No todos se digitan: los insumos clínicos consumidos en una consulta generan
// un gasto automático al cerrar la historia (origen 'consumo_insumos'). Ese no
// mueve caja — el dinero salió cuando se compró el insumo, no al aplicarlo.
const Gasto = sequelize.define('Gasto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  categoria: {
    type: DataTypes.ENUM(
      'nomina',
      'arriendo',
      'servicios_publicos',
      'insumos',
      'proveedor',
      'mantenimiento',
      'marketing',
      'impuestos',
      'otros'
    ),
    allowNull: false,
  },
  // Cifrado: puede contener nombres de empleados, proveedores o montos pactados.
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // No se cifra: necesario para SUM en el reporte de rentabilidad (mismo
  // criterio que los montos de Factura).
  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  // Plano (a diferencia de Factura.metodoPago): describe cómo paga el negocio,
  // no hábitos de un cliente, y se usa para filtrar/agrupar en reportes.
  metodoPago: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta', 'otro'),
    allowNull: false,
    defaultValue: 'efectivo',
  },
  // 'manual' lo digitó alguien; 'consumo_insumos' lo generó el sistema al
  // cerrar una historia clínica. La UI no ofrece el segundo al registrar.
  origen: {
    type: DataTypes.ENUM('manual', 'consumo_insumos'),
    allowNull: false,
    defaultValue: 'manual',
  },
  // Consulta que originó el consumo. Solo se llena en gastos automáticos, y
  // un índice único parcial impide que una misma historia genere dos.
  historiaClinicaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: HistoriaClinica,
      key: 'id',
    },
  },
  anulado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  motivoAnulacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Enlace al egreso de caja generado automáticamente cuando el gasto fue en
  // efectivo con turno abierto. Nullable: gastos por transferencia/tarjeta
  // o registrados sin turno no tocan la caja.
  movimientoCajaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: MovimientoCaja,
      key: 'id',
    },
  },
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
  tableName: 'gastos',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'fecha'] },
    { fields: ['clinicaId', 'categoria'] },
    { fields: ['clinicaId', 'anulado'] },
    { fields: ['cajaTurnoId'] },
  ],
})

registrarHooksCifrado(Gasto, {
  campos: ['descripcion'],
})

Usuario.hasMany(Gasto, { foreignKey: 'usuarioId', as: 'gastos' })
Gasto.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' })
Clinica.hasMany(Gasto, { foreignKey: 'clinicaId' })
Gasto.belongsTo(Clinica, { foreignKey: 'clinicaId' })
CajaTurno.hasMany(Gasto, { foreignKey: 'cajaTurnoId', as: 'gastos' })
Gasto.belongsTo(CajaTurno, { foreignKey: 'cajaTurnoId', as: 'cajaTurno' })
Gasto.belongsTo(MovimientoCaja, { foreignKey: 'movimientoCajaId', as: 'movimientoCaja' })
HistoriaClinica.hasOne(Gasto, { foreignKey: 'historiaClinicaId', as: 'gastoConsumo' })
Gasto.belongsTo(HistoriaClinica, { foreignKey: 'historiaClinicaId', as: 'historiaClinica' })

module.exports = Gasto
