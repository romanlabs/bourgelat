'use strict'

module.exports = {
  name: '20260704_000001_create_caja_turnos',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('caja_turnos')) {
      await queryInterface.createTable('caja_turnos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        estado: {
          type: Sequelize.ENUM('abierto', 'cerrado'),
          allowNull: false,
          defaultValue: 'abierto',
        },
        montoInicial: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        totalVentasEfectivo: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        totalIngresosManuales: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        totalEgresosManuales: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        montoFinalEsperado: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        montoFinalContado: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        diferencia: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
        },
        categoriaDiferencia: {
          type: Sequelize.ENUM(
            'error_vuelto',
            'gasto_no_registrado',
            'redondeo',
            'pago_no_registrado',
            'causa_desconocida',
            'otro'
          ),
          allowNull: true,
        },
        observacionesCierre: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        requiereRevisionAdmin: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        fechaApertura: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        fechaCierre: {
          type: Sequelize.DATE,
          allowNull: true,
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

      await queryInterface.addIndex('caja_turnos', ['clinicaId', 'estado'], {
        name: 'caja_turnos_clinica_estado_idx',
      })
      await queryInterface.addIndex('caja_turnos', ['clinicaId', 'usuarioId', 'estado'], {
        name: 'caja_turnos_clinica_usuario_estado_idx',
      })
      await queryInterface.addIndex('caja_turnos', ['clinicaId', 'fechaApertura'], {
        name: 'caja_turnos_clinica_fecha_idx',
      })

      // Cinturón de seguridad a nivel de DB: un solo turno abierto por usuario a la vez.
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS caja_turnos_usuario_abierto_unique_idx
        ON caja_turnos ("usuarioId") WHERE estado = 'abierto'
      `)
    }

    if (!tableNames.includes('movimientos_caja')) {
      await queryInterface.createTable('movimientos_caja', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tipo: {
          type: Sequelize.ENUM('ingreso', 'egreso'),
          allowNull: false,
        },
        monto: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
        },
        motivo: {
          type: Sequelize.ENUM(
            'fondo_adicional',
            'retiro_domicilio',
            'gasto_menor',
            'pago_proveedor',
            'prestamo_caja_chica',
            'otro'
          ),
          allowNull: false,
        },
        observaciones: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        cajaTurnoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'caja_turnos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
      })

      await queryInterface.addIndex('movimientos_caja', ['cajaTurnoId'], {
        name: 'movimientos_caja_turno_idx',
      })
      await queryInterface.addIndex('movimientos_caja', ['clinicaId', 'createdAt'], {
        name: 'movimientos_caja_clinica_fecha_idx',
      })
    }

    const facturasDesc = await queryInterface.describeTable('facturas')
    if (!facturasDesc.cajaTurnoId) {
      await queryInterface.addColumn('facturas', 'cajaTurnoId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'caja_turnos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
      await queryInterface.addIndex('facturas', ['cajaTurnoId'], {
        name: 'facturas_caja_turno_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const facturasDesc = await queryInterface.describeTable('facturas')
    if (facturasDesc.cajaTurnoId) {
      await queryInterface.removeIndex('facturas', 'facturas_caja_turno_idx').catch(() => {})
      await queryInterface.removeColumn('facturas', 'cajaTurnoId')
    }

    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('movimientos_caja')) {
      await queryInterface.dropTable('movimientos_caja')
    }
    if (tableNames.includes('caja_turnos')) {
      await queryInterface.dropTable('caja_turnos')
    }
  },
}
