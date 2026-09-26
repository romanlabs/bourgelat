const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Usuario = require('./Usuario');
const TicketSoporte = require('./TicketSoporte');

// Mensaje del hilo de un ticket. `autorTipo` distingue quien habla:
// - usuario: alguien de la clinica (autorId = su usuario)
// - soporte: el equipo de Bourgelat (autorId null desde el script; sera la
//   cuenta de soporte cuando exista el panel web)
// - sistema: evento del hilo, p. ej. un cambio de estado
const MensajeTicketSoporte = sequelize.define('MensajeTicketSoporte', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: TicketSoporte,
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
  autorTipo: {
    type: DataTypes.ENUM('usuario', 'soporte', 'sistema'),
    allowNull: false,
  },
  autorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
  autorNombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'mensajes_ticket_soporte',
  timestamps: true,
  indexes: [
    { name: 'mensajes_ticket_soporte_ticket_fecha_idx', fields: ['ticketId', 'createdAt'] },
    { name: 'mensajes_ticket_soporte_clinica_idx', fields: ['clinicaId'] },
  ]
});

TicketSoporte.hasMany(MensajeTicketSoporte, { foreignKey: 'ticketId', as: 'mensajes' });
MensajeTicketSoporte.belongsTo(TicketSoporte, { foreignKey: 'ticketId', as: 'ticket' });
MensajeTicketSoporte.belongsTo(Usuario, { foreignKey: 'autorId', as: 'autor' });

module.exports = MensajeTicketSoporte;
