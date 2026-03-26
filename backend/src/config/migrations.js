const fs = require('fs')
const path = require('path')
const { DataTypes } = require('sequelize')

const sequelize = require('./database')

const MIGRATIONS_TABLE = 'schema_migrations'
const migrationsDirectory = path.join(__dirname, '..', 'migrations')

const normalizarNombreTabla = (table) => {
  if (typeof table === 'string') return table

  if (table?.tableName) return table.tableName
  if (table?.name) return table.name

  return String(table)
}

const obtenerTablas = async (queryInterface) => {
  const tables = await queryInterface.showAllTables()
  return tables.map(normalizarNombreTabla)
}

const existeTabla = async (queryInterface, tableName) => {
  const tables = await obtenerTablas(queryInterface)
  return tables.includes(tableName)
}

const asegurarTablaMigraciones = async (queryInterface) => {
  const tablaExiste = await existeTabla(queryInterface, MIGRATIONS_TABLE)

  if (tablaExiste) {
    return
  }

  await queryInterface.createTable(MIGRATIONS_TABLE, {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })
}

const obtenerArchivosMigracion = () => {
  if (!fs.existsSync(migrationsDirectory)) {
    return []
  }

  return fs.readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.js'))
    .sort()
}

const cargarMigraciones = () => {
  return obtenerArchivosMigracion().map((file) => {
    const fullPath = path.join(migrationsDirectory, file)
    const migration = require(fullPath)

    return {
      name: migration.name || file,
      up: migration.up,
      down: migration.down,
      file,
    }
  })
}

const obtenerMigracionesEjecutadas = async (queryInterface) => {
  await asegurarTablaMigraciones(queryInterface)

  const [rows] = await sequelize.query(`SELECT name FROM ${MIGRATIONS_TABLE}`)
  return new Set(rows.map((row) => row.name))
}

const registrarMigracion = async (queryInterface, name, transaction) => {
  await queryInterface.bulkInsert(
    MIGRATIONS_TABLE,
    [{ name, executedAt: new Date() }],
    { transaction }
  )
}

const runPendingMigrations = async (logger = console) => {
  const queryInterface = sequelize.getQueryInterface()
  const migrations = cargarMigraciones()
  const ejecutadas = await obtenerMigracionesEjecutadas(queryInterface)
  const pendientes = migrations.filter((migration) => !ejecutadas.has(migration.name))

  if (!pendientes.length) {
    logger.info('No hay migraciones pendientes')
    return { pending: 0, executed: 0 }
  }

  for (const migration of pendientes) {
    logger.info(`Ejecutando migracion ${migration.name}`)

    const transaction = await sequelize.transaction()

    try {
      await migration.up({
        queryInterface,
        Sequelize: DataTypes,
        sequelize,
        transaction,
      })

      await registrarMigracion(queryInterface, migration.name, transaction)
      await transaction.commit()
      logger.info(`Migracion ejecutada: ${migration.name}`)
    } catch (error) {
      await transaction.rollback()
      logger.error(`Error ejecutando migracion ${migration.name}: ${error.message}`)
      throw error
    }
  }

  return {
    pending: 0,
    executed: pendientes.length,
  }
}

const getMigrationStatus = async () => {
  const queryInterface = sequelize.getQueryInterface()
  const migrations = cargarMigraciones()
  const ejecutadas = await obtenerMigracionesEjecutadas(queryInterface)

  return migrations.map((migration) => ({
    name: migration.name,
    file: migration.file,
    executed: ejecutadas.has(migration.name),
  }))
}

module.exports = {
  runPendingMigrations,
  getMigrationStatus,
  existeTabla,
}
