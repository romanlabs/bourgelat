const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Mascota = require('./Mascota');
const Clinica = require('./Clinica');
const Usuario = require('./Usuario');

const ExamenLaboratorio = sequelize.define('ExamenLaboratorio', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tipo de examen: Hemograma, Perfil renal, Radiografia, etc.',
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  resultados: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  interpretacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  laboratorio: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre del laboratorio externo que proceso la muestra',
  },
  archivoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Ruta relativa del archivo adjunto (PDF o imagen) dentro de uploads',
  },
  archivoNombre: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nombre original del archivo adjunto',
  },
  mascotaId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  registradoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Usuario,
      key: 'id',
    },
  },
}, {
  tableName: 'examenes_laboratorio',
  timestamps: true,
  indexes: [
    { fields: ['mascotaId', 'fecha'] },
    { fields: ['clinicaId'] },
  ],
});

Mascota.hasMany(ExamenLaboratorio, { foreignKey: 'mascotaId', as: 'examenesLaboratorio' });
ExamenLaboratorio.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Clinica.hasMany(ExamenLaboratorio, { foreignKey: 'clinicaId' });
ExamenLaboratorio.belongsTo(Clinica, { foreignKey: 'clinicaId' });
ExamenLaboratorio.belongsTo(Usuario, { foreignKey: 'registradoPorId', as: 'registradoPor' });

module.exports = ExamenLaboratorio;
