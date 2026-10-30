'use strict'

// Ajustes de la campanita por usuario: qué categorías no quiere recibir, si le
// llega correo de lo urgente y qué avisos derivados ya leyó (así lo leído en
// el computador tampoco sale como nuevo en el celular).
module.exports = {
  name: '20261030_000001_ajustes_avisos',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('ajustes_avisos')) return

    await queryInterface.createTable('ajustes_avisos', {
      usuarioId: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: { model: 'usuarios', key: 'id' },
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
      categoriasApagadas: {
        type: Sequelize.ARRAY(Sequelize.STRING(20)),
        allowNull: false,
        defaultValue: [],
      },
      correoUrgente: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      leidasDerivadas: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }, { transaction })

    // El job de lo urgente busca los avisos ya creados de una entidad.
    await queryInterface.addIndex('notificaciones', ['entidadId', 'tipo'], {
      name: 'notificaciones_entidad_tipo_idx',
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    await queryInterface.removeIndex('notificaciones', 'notificaciones_entidad_tipo_idx', { transaction }).catch(() => {})
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('ajustes_avisos')) {
      await queryInterface.dropTable('ajustes_avisos', { transaction })
    }
  },
}
