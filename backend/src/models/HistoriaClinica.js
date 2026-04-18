const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Mascota = require('./Mascota');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');
const Cita = require('./Cita');

const HistoriaClinica = sequelize.define('HistoriaClinica', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fechaConsulta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  motivoConsulta: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  anamnesis: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Historia del problema contada por el propietario',
  },
  // Examen fisico
  peso: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  temperatura: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true,
    comment: 'Temperatura en grados Celsius',
  },
  frecuenciaCardiaca: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Latidos por minuto',
  },
  frecuenciaRespiratoria: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Respiraciones por minuto',
  },
  condicionCorporal: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Escala del 1 al 5',
  },
  mucosas: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  estadoHidratacion: {
    type: DataTypes.ENUM('normal', 'deshidratacion_leve', 'deshidratacion_moderada', 'deshidratacion_severa'),
    allowNull: true,
  },
  examenFisicoDetalle: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observaciones adicionales del examen fisico',
  },
  // Diagnostico y tratamiento
  diagnostico: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  diagnosticoPresuntivo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Diagnostico probable cuando no es definitivo',
  },
  tratamiento: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  medicamentos: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Lista de medicamentos formulados con dosis e instrucciones',
  },
  indicaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Indicaciones para el propietario',
  },
  proximaConsulta: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Control de integridad
  bloqueada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Una vez bloqueada no se puede editar - RF-31',
  },
  citaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Cita,
      key: 'id',
    },
  },
  mascotaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Mascota,
      key: 'id',
    },
  },
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Propietario,
      key: 'id',
    },
  },
  veterinarioId: {
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
},  {
  tableName: 'historias_clinicas',
  timestamps: true,
  updatedAt: false,
  comment: 'Las historias clinicas son inmutables una vez bloqueadas',
  indexes: [
    { fields: ['mascotaId', 'clinicaId'] },
    { fields: ['clinicaId', 'fechaConsulta'] },
    { fields: ['veterinarioId'] },
    { fields: ['citaId'] },
  ],
});

Mascota.hasMany(HistoriaClinica, { foreignKey: 'mascotaId', as: 'historias' });
HistoriaClinica.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Propietario.hasMany(HistoriaClinica, { foreignKey: 'propietarioId', as: 'historias' });
HistoriaClinica.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(HistoriaClinica, { foreignKey: 'veterinarioId', as: 'consultas' });
HistoriaClinica.belongsTo(Usuario, { foreignKey: 'veterinarioId', as: 'veterinario' });
Cita.hasOne(HistoriaClinica, { foreignKey: 'citaId', as: 'historia' });
HistoriaClinica.belongsTo(Cita, { foreignKey: 'citaId', as: 'cita' });
Clinica.hasMany(HistoriaClinica, { foreignKey: 'clinicaId' });
HistoriaClinica.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = HistoriaClinica;