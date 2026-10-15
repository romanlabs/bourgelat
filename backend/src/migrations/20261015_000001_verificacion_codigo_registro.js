'use strict'

// Verificación del correo por código de 6 dígitos al registrarse. La columna
// nueva es false por defecto: las cuentas existentes no se ven afectadas aunque
// tengan emailVerificado en false.
module.exports = {
  name: '20261015_000001_verificacion_codigo_registro',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const columnas = await queryInterface.describeTable('usuarios', { transaction })
    if (!columnas.requiereVerificacionCodigo) {
      await queryInterface.addColumn('usuarios', 'requiereVerificacionCodigo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      }, { transaction })
    }

    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('codigos_verificacion_email')) return

    await queryInterface.createTable('codigos_verificacion_email', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      codigoHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      expiracion: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      intentos: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      usado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex('codigos_verificacion_email', ['usuarioId'], {
      name: 'codigos_verificacion_email_usuario_idx',
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('codigos_verificacion_email')) {
      await queryInterface.dropTable('codigos_verificacion_email', { transaction })
    }
    const columnas = await queryInterface.describeTable('usuarios', { transaction })
    if (columnas.requiereVerificacionCodigo) {
      await queryInterface.removeColumn('usuarios', 'requiereVerificacionCodigo', { transaction })
    }
  },
}
