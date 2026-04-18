const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Mascota = require('./Mascota');
const Clinica = require('./Clinica');

const AntecedentesMascota = sequelize.define('AntecedentesMascota', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  // Alergias
  alergias: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Lista de alergias: [{tipo, descripcion, reaccion, fecha}]',
  },
  // Enfermedades previas
  enfermedadesPrevias: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Lista de enfermedades: [{nombre, fechaDiagnostico, tratamiento, resuelto}]',
  },
  // Cirugias
  cirugias: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Lista de cirugias: [{nombre, fecha, veterinario, observaciones}]',
  },
  // Vacunas
  vacunas: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Lista de vacunas: [{nombre, fecha, proximaDosis, lote, laboratorio}]',
  },
  // Condiciones cronicas
  condicionesCronicas: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Condiciones permanentes: [{nombre, fechaDiagnostico, tratamientoActual}]',
  },
  // Medicamentos actuales
  medicamentosActuales: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Medicamentos en curso: [{nombre, dosis, frecuencia, desde}]',
  },
  // Informacion reproductiva
  esterilizado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  fechaEsterilizacion: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Observaciones generales
  observacionesGenerales: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mascotaId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: Mascota,
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
  tableName: 'antecedentes_mascota',
  timestamps: true,
  indexes: [
  { fields: ['mascotaId'], unique: true },
  { fields: ['clinicaId'] },
]
});

Mascota.hasOne(AntecedentesMascota, { foreignKey: 'mascotaId', as: 'antecedentes' });
AntecedentesMascota.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Clinica.hasMany(AntecedentesMascota, { foreignKey: 'clinicaId' });
AntecedentesMascota.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = AntecedentesMascota;