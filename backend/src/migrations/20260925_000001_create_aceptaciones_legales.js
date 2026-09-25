'use strict'

// Registro de aceptación de términos, autorización de tratamiento de datos y
// consentimiento de comunicaciones comerciales (prueba de consentimiento).
// Append-only: sin updatedAt a propósito.
const ENUM = 'enum_aceptaciones_legales_documento'

module.exports = {
  name: '20260925_000001_create_aceptaciones_legales',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('aceptaciones_legales')) return

    await queryInterface.createTable('aceptaciones_legales', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      documento: {
        type: Sequelize.ENUM('terminos', 'privacidad', 'comunicaciones_comerciales'),
        allowNull: false,
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      aceptado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      origen: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      ip: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true,
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }, { transaction })

    await queryInterface.addIndex('aceptaciones_legales', ['usuarioId', 'documento', 'createdAt'], {
      name: 'aceptaciones_legales_usuario_documento_idx',
      transaction,
    })
    await queryInterface.addIndex('aceptaciones_legales', ['clinicaId'], {
      name: 'aceptaciones_legales_clinica_idx',
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('aceptaciones_legales')) {
      await queryInterface.dropTable('aceptaciones_legales', { transaction })
    }
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM}"`, { transaction })
  },
}
