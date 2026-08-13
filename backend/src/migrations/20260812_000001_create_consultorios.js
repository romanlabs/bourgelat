'use strict'

module.exports = {
  name: '20260812_000001_create_consultorios',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('consultorios')) {
      await queryInterface.createTable('consultorios', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        nombre: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        descripcion: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        activo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      })

      await queryInterface.addIndex('consultorios', ['clinicaId', 'activo'], {
        name: 'consultorios_clinica_activo_idx',
      })
      await queryInterface.addIndex('consultorios', ['clinicaId', 'nombre'], {
        name: 'consultorios_clinica_nombre_idx',
        unique: true,
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('consultorios')) {
      await queryInterface.dropTable('consultorios')
    }
  },
}
