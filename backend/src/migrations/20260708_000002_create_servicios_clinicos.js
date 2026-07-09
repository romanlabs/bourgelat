'use strict'

module.exports = {
  name: '20260708_000002_create_servicios_clinicos',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('servicios_clinicos')) {
      await queryInterface.createTable('servicios_clinicos', {
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
          type: Sequelize.TEXT,
          allowNull: true,
        },
        categoria: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        precioVenta: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
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

      await queryInterface.addIndex('servicios_clinicos', ['clinicaId', 'activo'], {
        name: 'servicios_clinicos_clinica_activo_idx',
      })
    }

    if (!tableNames.includes('servicio_clinico_insumos')) {
      await queryInterface.createTable('servicio_clinico_insumos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        cantidadConsumida: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        servicioClinicoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'servicios_clinicos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        insumoClinicoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'insumos_clinicos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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

      await queryInterface.addIndex('servicio_clinico_insumos', ['servicioClinicoId'], {
        name: 'servicio_clinico_insumos_servicio_idx',
      })
      await queryInterface.addIndex('servicio_clinico_insumos', ['servicioClinicoId', 'insumoClinicoId'], {
        name: 'servicio_clinico_insumos_servicio_insumo_unique',
        unique: true,
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('servicio_clinico_insumos')) {
      await queryInterface.dropTable('servicio_clinico_insumos')
    }
    if (tableNames.includes('servicios_clinicos')) {
      await queryInterface.dropTable('servicios_clinicos')
    }
  },
}
