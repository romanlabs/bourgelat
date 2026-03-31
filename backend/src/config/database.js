const { Sequelize } = require('sequelize')
require('dotenv').config()

const dbSslEnabled = process.env.DB_SSL === 'true'
const dbSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
const dbSslCa = process.env.DB_SSL_CA ? process.env.DB_SSL_CA.replace(/\\n/g, '\n') : undefined

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: dbSslEnabled ? {
        require: true,
        rejectUnauthorized: dbSslRejectUnauthorized,
        ...(dbSslCa ? { ca: dbSslCa } : {}),
      } : false,
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000,
    },
    define: {
      underscored: false,
      freezeTableName: true,
      timestamps: true,
    },
  }
)

module.exports = sequelize
