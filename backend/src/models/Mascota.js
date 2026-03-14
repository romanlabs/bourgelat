const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Propietario = require('./Propietario');
const Clinica = require('./Clinica');

const Mascota = sequelize.define('Mascota', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  especie: {
    type: DataTypes.ENUM('perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'),
    allowNull: false,
  },
  raza: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sexo: {
    type: DataTypes.ENUM('macho', 'hembra', 'desconocido'),
    allowNull: false,
    defaultValue: 'desconocido',
  },
  fechaNacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  peso: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  esterilizado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  microchip: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fotoPerfil: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Propietario,
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
  tableName: 'mascotas',
  timestamps: true,
});

Propietario.hasMany(Mascota, { foreignKey: 'propietarioId' });
Mascota.belongsTo(Propietario, { foreignKey: 'propietarioId' });
Clinica.hasMany(Mascota, { foreignKey: 'clinicaId' });
Mascota.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = Mascota;