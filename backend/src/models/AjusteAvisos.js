const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')
const Clinica = require('./Clinica')
const Usuario = require('./Usuario')

// Ajustes de la campanita de un usuario. Sin fila, valen los de por defecto
// (todo encendido, sin correo). La tabla la crea la migración
// 20261030_000001_ajustes_avisos.
const AjusteAvisos = sequelize.define('AjusteAvisos', {
  usuarioId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: { model: Usuario, key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
  categoriasApagadas: {
    type: DataTypes.ARRAY(DataTypes.STRING(20)),
    allowNull: false,
    defaultValue: [],
  },
  correoUrgente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Ids de los avisos derivados (Fase A) que el usuario ya leyó y siguen vigentes.
  leidasDerivadas: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
}, {
  tableName: 'ajustes_avisos',
  timestamps: true,
})

module.exports = AjusteAvisos
