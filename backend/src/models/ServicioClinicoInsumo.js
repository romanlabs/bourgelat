const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const ServicioClinico = require('./ServicioClinico');
const InsumoClinico = require('./InsumoClinico');
const Clinica = require('./Clinica');

const ServicioClinicoInsumo = sequelize.define('ServicioClinicoInsumo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cantidadConsumida: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cantidad del insumo, en su unidadBase, que consume una unidad de este servicio',
  },
  servicioClinicoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ServicioClinico,
      key: 'id',
    },
  },
  insumoClinicoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: InsumoClinico,
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
  tableName: 'servicio_clinico_insumos',
  timestamps: true,
  indexes: [
    { fields: ['servicioClinicoId'] },
    { fields: ['servicioClinicoId', 'insumoClinicoId'], unique: true },
  ]
});

ServicioClinico.hasMany(ServicioClinicoInsumo, { foreignKey: 'servicioClinicoId', as: 'insumos' });
ServicioClinicoInsumo.belongsTo(ServicioClinico, { foreignKey: 'servicioClinicoId', as: 'servicio' });
InsumoClinico.hasMany(ServicioClinicoInsumo, { foreignKey: 'insumoClinicoId', as: 'recetas' });
ServicioClinicoInsumo.belongsTo(InsumoClinico, { foreignKey: 'insumoClinicoId', as: 'insumo' });
Clinica.hasMany(ServicioClinicoInsumo, { foreignKey: 'clinicaId' });
ServicioClinicoInsumo.belongsTo(Clinica, { foreignKey: 'clinicaId' });

module.exports = ServicioClinicoInsumo;
