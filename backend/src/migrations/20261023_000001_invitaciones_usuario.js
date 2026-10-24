'use strict'

// Invitación de usuarios por enlace: el administrador ya no define la
// contraseña de su equipo; cada persona la crea desde un enlace de un solo uso
// que llega a su correo. Las cuentas existentes no cambian.
module.exports = {
  name: '20261023_000001_invitaciones_usuario',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('invitaciones_usuario')) return

    await queryInterface.createTable('invitaciones_usuario', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      expiracion: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      usado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
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
      creadoPorId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }, { transaction })

    await queryInterface.addIndex('invitaciones_usuario', ['usuarioId'], {
      name: 'invitaciones_usuario_usuario_idx',
      transaction,
    })
    await queryInterface.addIndex('invitaciones_usuario', ['clinicaId', 'createdAt'], {
      name: 'invitaciones_usuario_clinica_fecha_idx',
      transaction,
    })
    await queryInterface.addIndex('invitaciones_usuario', ['expiracion'], {
      name: 'invitaciones_usuario_expiracion_idx',
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('invitaciones_usuario')) {
      await queryInterface.dropTable('invitaciones_usuario', { transaction })
    }
  },
}
