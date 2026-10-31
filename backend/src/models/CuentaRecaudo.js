const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');

// Cuenta donde la clínica recibe transferencias («Nequi», «Bancolombia
// ahorros»…). La configura cada clínica: el código solo conoce el medio
// 'transferencia' y la cuenta dice a cuál de las suyas entró la plata.
const CuentaRecaudo = sequelize.define('CuentaRecaudo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // Borrada desde Configuración: no sale en la lista ni al cobrar, pero las
  // ventas que entraron a ella siguen mostrando su nombre.
  borradaEn: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'cuentas_recaudo',
  timestamps: true,
  indexes: [
    { fields: ['clinicaId', 'activo'] },
    { fields: ['clinicaId', 'nombre'], unique: true },
  ]
});

Clinica.hasMany(CuentaRecaudo, { foreignKey: 'clinicaId' });
CuentaRecaudo.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = CuentaRecaudo;
