const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Usuario = require('./Usuario');

// Ticket de soporte abierto por una clinica. La conversacion vive en
// MensajeTicketSoporte; la descripcion inicial es el primer mensaje.
const TicketSoporte = sequelize.define('TicketSoporte', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // Secuencia creada por la migracion 20260915_000001 (ver alli el porque).
    defaultValue: sequelize.literal("nextval('tickets_soporte_numero_seq')"),
    comment: 'Numero legible del ticket; el codigo visible es SOP-00042',
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Clinica,
      key: 'id',
    },
  },
  creadoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
  asunto: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  categoria: {
    type: DataTypes.ENUM('error', 'duda', 'facturacion', 'sugerencia', 'otro'),
    allowNull: false,
    defaultValue: 'error',
  },
  prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    allowNull: false,
    defaultValue: 'media',
  },
  estado: {
    type: DataTypes.ENUM('abierto', 'en_progreso', 'esperando_usuario', 'resuelto', 'cerrado'),
    allowNull: false,
    defaultValue: 'abierto',
  },
  asignadoA: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Persona del equipo de Bourgelat que lleva el ticket',
  },
  modulo: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Ruta de la app desde la que se reporto el problema',
  },
  contexto: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Datos tecnicos capturados al reportar: navegador, pantalla, ruta, rol',
  },
  capturaUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  ultimaActividadAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  resueltoAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tickets_soporte',
  timestamps: true,
  indexes: [
    { name: 'tickets_soporte_numero_unique', unique: true, fields: ['numero'] },
    { name: 'tickets_soporte_clinica_estado_idx', fields: ['clinicaId', 'estado'] },
    { name: 'tickets_soporte_clinica_creador_idx', fields: ['clinicaId', 'creadoPorId'] },
    { name: 'tickets_soporte_estado_actividad_idx', fields: ['estado', 'ultimaActividadAt'] },
  ]
});

Clinica.hasMany(TicketSoporte, { foreignKey: 'clinicaId' });
TicketSoporte.belongsTo(Clinica, { foreignKey: 'clinicaId' });
TicketSoporte.belongsTo(Usuario, { foreignKey: 'creadoPorId', as: 'creadoPor' });

module.exports = TicketSoporte;
