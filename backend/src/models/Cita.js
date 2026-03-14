const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Mascota = require('./Mascota');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');

const Cita = sequelize.define('Cita', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipoCita: {
    type: DataTypes.ENUM(
      'consulta_general',
      'vacunacion',
      'cirugia',
      'desparasitacion',
      'control',
      'urgencia',
      'peluqueria',
      'laboratorio',
      'radiografia',
      'otro'
    ),
    allowNull: false,
    defaultValue: 'consulta_general',
  },
  estado: {
    type: DataTypes.ENUM(
      'programada',
      'confirmada',
      'en_curso',
      'completada',
      'cancelada',
      'no_asistio'
    ),
    allowNull: false,
    defaultValue: 'programada',
  },
  motivoCancelacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recordatorioEnviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
}, {
  tableName: 'citas',
  timestamps: true,
  indexes: [
    {
      fields: ['fecha', 'veterinarioId', 'clinicaId'],
    },
  ],
});

Mascota.hasMany(Cita, { foreignKey: 'mascotaId', as: 'mascota' });
Cita.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Propietario.hasMany(Cita, { foreignKey: 'propietarioId', as: 'propietario' });
Cita.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(Cita, { foreignKey: 'veterinarioId' });
Cita.belongsTo(Usuario, { foreignKey: 'veterinarioId', as: 'veterinario' });
Clinica.hasMany(Cita, { foreignKey: 'clinicaId' });
Cita.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Cita;