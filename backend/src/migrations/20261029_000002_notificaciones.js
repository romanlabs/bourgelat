'use strict'

// Avisos de la campanita (Fase B): una fila por destinatario. Los avisos que
// salen del estado actual (stock bajo, historias sin cerrar) se siguen
// derivando en el frontend; aquí quedan los que nacen de un hecho con fecha
// (llegó un paciente, se registró un examen, se cerró un turno).
module.exports = {
  name: '20261029_000002_notificaciones',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('notificaciones')) return

    await queryInterface.createTable('notificaciones', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      usuarioId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Mismos valores que CATEGORIAS en services/notificacionReglas.js.
      categoria: {
        type: Sequelize.ENUM('clinica', 'inventario', 'caja', 'sistema'),
        allowNull: false,
      },
      tipo: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      titulo: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      texto: {
        type: Sequelize.STRING(400),
        allowNull: true,
      },
      enlace: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      entidadTipo: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      entidadId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      leidaEn: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }, { transaction })

    // La campanita pide «las mías, las más recientes» y cuenta las sin leer.
    await queryInterface.addIndex('notificaciones', ['usuarioId', 'createdAt'], {
      name: 'notificaciones_usuario_fecha_idx',
      transaction,
    })
    await queryInterface.addIndex('notificaciones', ['clinicaId'], {
      name: 'notificaciones_clinica_idx',
      transaction,
    })
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })
    if (tableNames.includes('notificaciones')) {
      await queryInterface.dropTable('notificaciones', { transaction })
    }
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_notificaciones_categoria"',
      { transaction },
    )
  },
}
