'use strict'

module.exports = {
  name: '20260824_000001_create_registros_estilo',

  up: async ({ queryInterface, Sequelize }) => {
    const tablas = await queryInterface.showAllTables()
    if (tablas.includes('registros_estilo')) return

    await queryInterface.createTable('registros_estilo', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      fechaServicio: { type: Sequelize.DATE, allowNull: false },
      tipoCorte: { type: Sequelize.STRING, allowNull: false },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      proximaCitaSugerida: { type: Sequelize.DATEONLY, allowNull: true },
      bloqueado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      facturaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'facturas', key: 'id' },
        onDelete: 'SET NULL',
      },
      citaId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'citas', key: 'id' },
        onDelete: 'SET NULL',
      },
      estilistaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      mascotaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'mascotas', key: 'id' },
        onDelete: 'CASCADE',
      },
      propietarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'propietarios', key: 'id' },
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('registros_estilo', ['mascotaId', 'clinicaId'])
    await queryInterface.addIndex('registros_estilo', ['clinicaId', 'fechaServicio'])
    await queryInterface.addIndex('registros_estilo', ['estilistaId'])
    await queryInterface.addIndex('registros_estilo', ['citaId'])
    await queryInterface.addIndex('registros_estilo', ['facturaId'])
  },

  down: async ({ queryInterface }) => {
    const tablas = await queryInterface.showAllTables()
    if (tablas.includes('registros_estilo')) {
      await queryInterface.dropTable('registros_estilo')
    }
  },
}
