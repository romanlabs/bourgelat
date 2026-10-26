'use strict'

// Registro de los recordatorios de cobro ya enviados. La clave única
// (suscripcionId, tipo) garantiza que cada aviso se envíe una sola vez por
// suscripción, aunque el job corra dos veces o haya dos instancias.
module.exports = {
  name: '20261026_000001_recordatorios_suscripcion',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('recordatorios_suscripcion')) return

    await queryInterface.createTable('recordatorios_suscripcion', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      suscripcionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suscripciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Mismos valores que TIPOS en services/recordatoriosCobroReglas.js; se
      // escriben aquí a propósito para que la migración no dependa del código.
      tipo: {
        type: Sequelize.ENUM('vence_pronto', 'vence_manana', 'vencida'),
        allowNull: false,
      },
      enviadoEn: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      destinatarios: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    }, { transaction })

    await queryInterface.addIndex('recordatorios_suscripcion', ['suscripcionId', 'tipo'], {
      name: 'recordatorios_suscripcion_suscripcion_tipo_uq',
      unique: true,
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('recordatorios_suscripcion')) {
      await queryInterface.dropTable('recordatorios_suscripcion', { transaction })
    }
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_recordatorios_suscripcion_tipo"',
      { transaction },
    )
  },
}
