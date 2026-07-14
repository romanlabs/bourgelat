'use strict'

module.exports = {
  name: '20260714_000001_create_examenes_laboratorio',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('examenes_laboratorio')) {
      await queryInterface.createTable('examenes_laboratorio', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tipo: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        resultados: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        interpretacion: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        laboratorio: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        archivoUrl: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        archivoNombre: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        mascotaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'mascotas', key: 'id' },
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
        registradoPorId: {
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

      await queryInterface.addIndex('examenes_laboratorio', ['mascotaId', 'fecha'], {
        name: 'examenes_laboratorio_mascota_fecha_idx',
      })
      await queryInterface.addIndex('examenes_laboratorio', ['clinicaId'], {
        name: 'examenes_laboratorio_clinica_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('examenes_laboratorio')) {
      await queryInterface.dropTable('examenes_laboratorio')
    }
  },
}
