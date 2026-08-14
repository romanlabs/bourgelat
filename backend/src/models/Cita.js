const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Mascota = require('./Mascota');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');
const Consultorio = require('./Consultorio');
const { aplicarDescifrado } = require('../config/modelEncryption');

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
      'en_espera',
      'en_atencion',
      'completada',
      'cancelada',
      'no_asistio'
    ),
    allowNull: false,
    defaultValue: 'programada',
  },
  origen: {
    type: DataTypes.ENUM('programada', 'walk_in'),
    allowNull: false,
    defaultValue: 'programada',
  },
  horaLlegada: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  horaInicioAtencion: {
    type: DataTypes.TIME,
    allowNull: true,
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
  consultorioId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Consultorio,
      key: 'id',
    },
  },
}, {
  tableName: 'citas',
  timestamps: true,
  indexes: [
  { fields: ['fecha', 'veterinarioId', 'clinicaId'] },
  { fields: ['clinicaId', 'estado'] },
  { fields: ['clinicaId', 'fecha'] },
  { fields: ['clinicaId', 'fecha', 'estado'] },
  { fields: ['clinicaId', 'consultorioId', 'fecha'] },
  { fields: ['propietarioId'] },
  { fields: ['mascotaId'] },
]
});

Mascota.hasMany(Cita, { foreignKey: 'mascotaId', as: 'mascota' });
Cita.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Propietario.hasMany(Cita, { foreignKey: 'propietarioId', as: 'propietario' });
Cita.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(Cita, { foreignKey: 'veterinarioId' });
Cita.belongsTo(Usuario, { foreignKey: 'veterinarioId', as: 'veterinario' });
Clinica.hasMany(Cita, { foreignKey: 'clinicaId' });
Cita.belongsTo(Clinica, { foreignKey: 'clinicaId' });
Consultorio.hasMany(Cita, { foreignKey: 'consultorioId' });
Cita.belongsTo(Consultorio, { foreignKey: 'consultorioId', as: 'consultorio' });

Cita.addHook('afterFind', (resultado) => {
  if (!resultado) return
  const descifrar = (inst) => {
    const prop = inst?.dataValues?.propietario
    if (prop) aplicarDescifrado({ instance: prop, ...Propietario.CIFRADO })
  }
  Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
})

module.exports = Cita;