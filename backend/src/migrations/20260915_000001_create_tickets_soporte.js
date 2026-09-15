'use strict'

// Tickets de soporte que abren las clinicas y el hilo de mensajes de cada uno.
//
// `numero` sale de una secuencia propia (no de autoIncrement) para dar un codigo
// legible (SOP-00042) sin exponer UUIDs en correos ni en la shell. Se evita
// autoIncrement en una columna que no es PK porque `sync({ alter })` de
// desarrollo intenta convertirla a SERIAL en cada arranque y falla.
const SECUENCIA = 'tickets_soporte_numero_seq'

const ENUMS = [
  'enum_tickets_soporte_categoria',
  'enum_tickets_soporte_prioridad',
  'enum_tickets_soporte_estado',
  'enum_mensajes_ticket_soporte_autorTipo',
]

module.exports = {
  name: '20260915_000001_create_tickets_soporte',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })

    if (!tableNames.includes('tickets_soporte')) {
      await queryInterface.sequelize.query(`CREATE SEQUENCE IF NOT EXISTS ${SECUENCIA}`, { transaction })

      await queryInterface.createTable('tickets_soporte', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        numero: {
          type: Sequelize.INTEGER,
          allowNull: false,
          // El runner pasa los DataTypes como `Sequelize`, no la clase: el
          // literal sale de la instancia.
          defaultValue: queryInterface.sequelize.literal(`nextval('${SECUENCIA}')`),
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
        asunto: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        categoria: {
          type: Sequelize.ENUM('error', 'duda', 'facturacion', 'sugerencia', 'otro'),
          allowNull: false,
          defaultValue: 'error',
        },
        prioridad: {
          type: Sequelize.ENUM('baja', 'media', 'alta'),
          allowNull: false,
          defaultValue: 'media',
        },
        estado: {
          type: Sequelize.ENUM('abierto', 'en_progreso', 'esperando_usuario', 'resuelto', 'cerrado'),
          allowNull: false,
          defaultValue: 'abierto',
        },
        asignadoA: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        modulo: {
          type: Sequelize.STRING(120),
          allowNull: true,
        },
        contexto: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        capturaUrl: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        ultimaActividadAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        resueltoAt: {
          type: Sequelize.DATE,
          allowNull: true,
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

      await queryInterface.sequelize.query(
        `ALTER SEQUENCE ${SECUENCIA} OWNED BY tickets_soporte.numero`,
        { transaction }
      )

      await queryInterface.addIndex('tickets_soporte', ['numero'], {
        name: 'tickets_soporte_numero_unique',
        unique: true,
        transaction,
      })
      await queryInterface.addIndex('tickets_soporte', ['clinicaId', 'estado'], {
        name: 'tickets_soporte_clinica_estado_idx',
        transaction,
      })
      await queryInterface.addIndex('tickets_soporte', ['clinicaId', 'creadoPorId'], {
        name: 'tickets_soporte_clinica_creador_idx',
        transaction,
      })
      // Bandeja del equipo de Bourgelat (hoy el script, a futuro el panel web).
      await queryInterface.addIndex('tickets_soporte', ['estado', 'ultimaActividadAt'], {
        name: 'tickets_soporte_estado_actividad_idx',
        transaction,
      })
    }

    if (!tableNames.includes('mensajes_ticket_soporte')) {
      await queryInterface.createTable('mensajes_ticket_soporte', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        ticketId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'tickets_soporte', key: 'id' },
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
        autorTipo: {
          type: Sequelize.ENUM('usuario', 'soporte', 'sistema'),
          allowNull: false,
        },
        autorId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        autorNombre: {
          type: Sequelize.STRING(120),
          allowNull: false,
        },
        mensaje: {
          type: Sequelize.TEXT,
          allowNull: false,
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

      await queryInterface.addIndex('mensajes_ticket_soporte', ['ticketId', 'createdAt'], {
        name: 'mensajes_ticket_soporte_ticket_fecha_idx',
        transaction,
      })
      await queryInterface.addIndex('mensajes_ticket_soporte', ['clinicaId'], {
        name: 'mensajes_ticket_soporte_clinica_idx',
        transaction,
      })
    }
  },

  down: async ({ queryInterface, transaction }) => {
    const tableNames = await queryInterface.showAllTables({ transaction })

    if (tableNames.includes('mensajes_ticket_soporte')) {
      await queryInterface.dropTable('mensajes_ticket_soporte', { transaction })
    }

    if (tableNames.includes('tickets_soporte')) {
      await queryInterface.dropTable('tickets_soporte', { transaction })
    }

    await queryInterface.sequelize.query(`DROP SEQUENCE IF EXISTS ${SECUENCIA}`, { transaction })

    for (const tipo of ENUMS) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${tipo}"`, { transaction })
    }
  },
}
