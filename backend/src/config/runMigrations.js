require('dotenv').config()

const sequelize = require('./database')
const { getMigrationStatus, runPendingMigrations } = require('./migrations')

const main = async () => {
  const mode = process.argv[2] || 'up'

  await sequelize.authenticate()

  if (mode === 'status') {
    const status = await getMigrationStatus()
    console.table(status)
    return
  }

  await runPendingMigrations(console)
}

main()
  .then(async () => {
    await sequelize.close()
  })
  .catch(async (error) => {
    console.error('Fallo en migraciones:', error.message)
    await sequelize.close()
    process.exit(1)
  })
