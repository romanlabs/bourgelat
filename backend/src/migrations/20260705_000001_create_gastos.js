'use strict'

module.exports = {
  name: '20260705_000001_create_gastos',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('gastos')) {
      await queryInterface.createTable('gastos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        categoria: {
          type: Sequelize.ENUM(
            'nomina',
            'arriendo',
            'servicios_publicos',
            'insumos',
            'proveedor',
            'mantenimiento',
            'marketing',
            'impuestos',
            'otros'
          ),
          allowNull: false,
        },
        descripcion: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        monto: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        metodoPago: {
          type: Sequelize.ENUM('efectivo', 'transferencia', 'tarjeta', 'otro'),
          allowNull: false,
          defaultValue: 'efectivo',
        },
        anulado: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        motivoAnulacion: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        movimientoCajaId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'movimientos_caja', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        cajaTurnoId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'caja_turnos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        usuarioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'usuarios', key: 'id' },
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

      await queryInterface.addIndex('gastos', ['clinicaId', 'fecha'], {
        name: 'gastos_clinica_fecha_idx',
      })
      await queryInterface.addIndex('gastos', ['clinicaId', 'categoria'], {
        name: 'gastos_clinica_categoria_idx',
      })
      await queryInterface.addIndex('gastos', ['clinicaId', 'anulado'], {
        name: 'gastos_clinica_anulado_idx',
      })
      await queryInterface.addIndex('gastos', ['cajaTurnoId'], {
        name: 'gastos_caja_turno_idx',
      })
    }

    // Nuevo motivo para los egresos de caja generados automáticamente por un
    // gasto del negocio pagado en efectivo. ADD VALUE IF NOT EXISTS es
    // idempotente, igual que el resto de esta migración.
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_movimientos_caja_motivo" ADD VALUE IF NOT EXISTS 'gasto_negocio'
    `)
  },

  down: async ({ queryInterface }) => {
    // El valor de ENUM 'gasto_negocio' no se puede remover en Postgres sin
    // recrear el tipo; se deja (inofensivo si no hay filas que lo usen).
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('gastos')) {
      await queryInterface.dropTable('gastos')
    }
  },
}
