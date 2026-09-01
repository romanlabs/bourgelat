'use strict'

module.exports = {
  name: '20260901_000002_create_bloqueos_agenda',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('bloqueos_agenda')) {
      await queryInterface.createTable('bloqueos_agenda', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        fechaInicio: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        fechaFin: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        horaInicio: {
          type: Sequelize.TIME,
          allowNull: true,
        },
        horaFin: {
          type: Sequelize.TIME,
          allowNull: true,
        },
        motivo: {
          type: Sequelize.STRING,
          allowNull: false,
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
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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

      await queryInterface.addIndex('bloqueos_agenda', ['clinicaId', 'fechaInicio', 'fechaFin'], {
        name: 'bloqueos_agenda_clinica_rango_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('bloqueos_agenda')) {
      await queryInterface.dropTable('bloqueos_agenda')
    }
  },
}
