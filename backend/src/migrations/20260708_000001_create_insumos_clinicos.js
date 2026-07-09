'use strict'

module.exports = {
  name: '20260708_000001_create_insumos_clinicos',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('insumos_clinicos')) {
      await queryInterface.createTable('insumos_clinicos', {
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
          type: Sequelize.ENUM('medicamento', 'vacuna', 'insumo', 'antiparasitario', 'suplemento', 'otro'),
          allowNull: false,
          defaultValue: 'insumo',
        },
        unidadBase: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        cantidadPresentacion: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        unidadPresentacion: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        precioPresentacion: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        precioUnitarioBase: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        stock: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        stockMinimo: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        fechaVencimiento: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        lote: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        laboratorio: {
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

      await queryInterface.addIndex('insumos_clinicos', ['clinicaId', 'categoria'], {
        name: 'insumos_clinicos_clinica_categoria_idx',
      })
      await queryInterface.addIndex('insumos_clinicos', ['clinicaId', 'activo'], {
        name: 'insumos_clinicos_clinica_activo_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('insumos_clinicos')) {
      await queryInterface.dropTable('insumos_clinicos')
    }
  },
}
