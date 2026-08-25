const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Clinica = require('./Clinica');
const Mascota = require('./Mascota');
const Propietario = require('./Propietario');
const Usuario = require('./Usuario');
const Cita = require('./Cita');
const { aplicarDescifrado } = require('../config/modelEncryption');

const RegistroEstilo = sequelize.define('RegistroEstilo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fechaServicio: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  tipoCorte: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Texto libre: el corte o servicio de estilos realizado',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Estado del pelaje, piel o comportamiento durante el servicio',
  },
  proximaCitaSugerida: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Solo sugerencia; no crea cita en agenda',
  },
  // Al facturarse queda bloqueado. A diferencia de HistoriaClinica, aqui
  // facturar es lo que bloquea: una peluqueada no tiene el requisito legal
  // de inmutabilidad que justifica cerrar y cobrar en dos pasos.
  bloqueado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Sin `references` para no acoplar este modelo a Factura (mismo criterio
  // que HistoriaClinica.facturaId); la FK real la crea la migracion.
  facturaId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  citaId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Cita, key: 'id' },
  },
  estilistaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Usuario, key: 'id' },
  },
  mascotaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Mascota, key: 'id' },
  },
  propietarioId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Propietario, key: 'id' },
  },
  clinicaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Clinica, key: 'id' },
  },
}, {
  tableName: 'registros_estilo',
  timestamps: true,
  indexes: [
    { fields: ['mascotaId', 'clinicaId'] },
    { fields: ['clinicaId', 'fechaServicio'] },
    { fields: ['estilistaId'] },
    { fields: ['citaId'] },
    { fields: ['facturaId'] },
  ],
});

Mascota.hasMany(RegistroEstilo, { foreignKey: 'mascotaId', as: 'registrosEstilo' });
RegistroEstilo.belongsTo(Mascota, { foreignKey: 'mascotaId', as: 'mascota' });
Propietario.hasMany(RegistroEstilo, { foreignKey: 'propietarioId', as: 'registrosEstilo' });
RegistroEstilo.belongsTo(Propietario, { foreignKey: 'propietarioId', as: 'propietario' });
Usuario.hasMany(RegistroEstilo, { foreignKey: 'estilistaId', as: 'serviciosEstilo' });
RegistroEstilo.belongsTo(Usuario, { foreignKey: 'estilistaId', as: 'estilista' });
Cita.hasOne(RegistroEstilo, { foreignKey: 'citaId', as: 'registroEstilo' });
RegistroEstilo.belongsTo(Cita, { foreignKey: 'citaId', as: 'cita' });
Clinica.hasMany(RegistroEstilo, { foreignKey: 'clinicaId' });
RegistroEstilo.belongsTo(Clinica, { foreignKey: 'clinicaId' });

RegistroEstilo.addHook('afterFind', (resultado) => {
  if (!resultado) return
  const descifrar = (inst) => {
    const prop = inst?.dataValues?.propietario
    if (prop) aplicarDescifrado({ instance: prop, ...Propietario.CIFRADO })
  }
  Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
})

module.exports = RegistroEstilo;
