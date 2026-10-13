const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Propietario = require('./Propietario');
const Clinica = require('./Clinica');
const { aplicarDescifrado } = require('../config/modelEncryption');

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
  especieDetalle: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Detalle cuando especie es otro, ej: jaguar, boa, loro',
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
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Numero de historia clinica: consecutivo por clinica, asignado al crear el
  // paciente y para siempre (no se reutiliza aunque el paciente se desactive).
  numeroHistoria: {
    type: DataTypes.INTEGER,
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
  indexes: [
  { fields: ['propietarioId'] },
  { fields: ['clinicaId', 'activo'] },
  { fields: ['clinicaId', 'especie'] },
  { fields: ['clinicaId', 'numeroHistoria'], unique: true, name: 'mascotas_clinica_numero_historia_unique' },
]
});

Propietario.hasMany(Mascota, { foreignKey: 'propietarioId' });
Mascota.belongsTo(Propietario, { foreignKey: 'propietarioId' });
Clinica.hasMany(Mascota, { foreignKey: 'clinicaId' });
Mascota.belongsTo(Clinica, { foreignKey: 'clinicaId' });

// Sequelize v6 no dispara afterFind del modelo hijo cuando se carga vía include,
// por lo que el descifrado del Propietario anidado debe hacerse aquí.
Mascota.addHook('afterFind', (resultado) => {
  if (!resultado) return
  const descifrar = (inst) => {
    const prop = inst?.dataValues?.Propietario
    if (prop) aplicarDescifrado({ instance: prop, ...Propietario.CIFRADO })
  }
  Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
})

module.exports = Mascota;