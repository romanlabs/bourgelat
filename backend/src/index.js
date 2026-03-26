const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const helmet = require('helmet')
const hpp = require('hpp')
const xss = require('xss-clean')
const winston = require('winston')
const sequelize = require('./config/database')
const { appConfig } = require('./config/app')
const { runPendingMigrations } = require('./config/migrations')
const { limitadorGeneral, limitadorAuth } = require('./middlewares/rateLimitMiddleware')
const { idempotencia } = require('./middlewares/idempotenciaMiddleware')
const { limpiarTokensVencidos, limpiarLogsAntiguos, limpiarIdempotencia } = require('./jobs/limpiezaTokens')

dotenv.config()

// ── Logger ─────────────────────────────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/errores.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/actividad.log' }),
  ],
})

const app = express()
app.set('trust proxy', appConfig.trustProxy)

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet())
app.use(hpp())
if (appConfig.enableXssClean) {
  app.use(xss())
}

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || appConfig.frontendOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('Origen no permitido por CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}))

// ── Rate limiting ──────────────────────────────────────────
app.use(limitadorGeneral)

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Idempotencia ───────────────────────────────────────────
app.use(idempotencia)

// ── Log de peticiones ──────────────────────────────────────
app.use((req, res, next) => {
  logger.info({
    metodo: req.method,
    ruta: req.originalUrl,
    ip: req.ip,
  })
  next()
})

// ── Rutas ──────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes')
const usuarioRoutes = require('./routes/usuarioRoutes')
const propietarioRoutes = require('./routes/propietarioRoutes')
const mascotaRoutes = require('./routes/mascotaRoutes')
const citaRoutes = require('./routes/citaRoutes')
const historiaClinicaRoutes = require('./routes/historiaClinicaRoutes')
const inventarioRoutes = require('./routes/inventarioRoutes')
const facturaRoutes = require('./routes/facturaRoutes')
const reporteRoutes = require('./routes/reporteRoutes')
const suscripcionRoutes = require('./routes/suscripcionRoutes')
const antecedenteRoutes = require('./routes/antecedenteRoutes')
const auditoriaRoutes = require('./routes/auditoriaRoutes')
const integracionFacturacionRoutes = require('./routes/integracionFacturacionRoutes')

app.use('/api/auth', limitadorAuth, authRoutes)
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/propietarios', propietarioRoutes)
app.use('/api/mascotas', mascotaRoutes)
app.use('/api/citas', citaRoutes)
app.use('/api/historias', historiaClinicaRoutes)
app.use('/api/inventario', inventarioRoutes)
app.use('/api/facturas', facturaRoutes)
app.use('/api/reportes', reporteRoutes)
app.use('/api/suscripciones', suscripcionRoutes)
app.use('/api/antecedentes', antecedenteRoutes)
app.use('/api/auditoria', auditoriaRoutes)
app.use('/api/integraciones/facturacion', integracionFacturacionRoutes)

// ── Ruta base ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a Bourgelat API' })
})

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate()

    res.json({
      status: 'ok',
      service: 'bourgelat-backend',
      environment: appConfig.nodeEnv,
      database: 'reachable',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'bourgelat-backend',
      environment: appConfig.nodeEnv,
      database: 'unreachable',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

// ── Ruta no encontrada ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

// ── Manejo global de errores ───────────────────────────────
app.use((err, req, res, next) => {
  logger.error({
    mensaje: err.message,
    stack: err.stack,
    ruta: req.originalUrl,
  })
  res.status(500).json({ message: 'Error interno del servidor' })
})

// ── Conexión DB y arranque ─────────────────────────────────
const PORT = appConfig.port

const sincronizarBaseDeDatos = async () => {
  if (!appConfig.enableDbSync) {
    logger.info('Sincronizacion automatica de base de datos desactivada')
    return
  }

  logger.warn({
    mensaje: 'Sincronizacion automatica habilitada',
    alter: appConfig.enableDbAlter,
    entorno: appConfig.nodeEnv,
  })

  await sequelize.sync({ alter: appConfig.enableDbAlter })
}

const ejecutarMigracionesPendientes = async () => {
  if (!appConfig.enableDbMigrations) {
    logger.info('Ejecucion automatica de migraciones desactivada')
    return
  }

  await runPendingMigrations(logger)
}

sequelize.authenticate()
  .then(() => {
    logger.info('Conexión a la base de datos exitosa')
    return ejecutarMigracionesPendientes()
  })
  .then(() => {
    return sincronizarBaseDeDatos()
  })
  .then(() => {
    logger.info('Inicializacion de base de datos completada')
    app.listen(PORT, () => {
      logger.info(`Servidor Bourgelat corriendo en el puerto ${PORT}`);
    })

    // ── Jobs de limpieza ─────────────────────────────────
    limpiarTokensVencidos()
    limpiarLogsAntiguos()
    limpiarIdempotencia()
    setInterval(limpiarTokensVencidos, 24 * 60 * 60 * 1000)
    setInterval(limpiarLogsAntiguos, 24 * 60 * 60 * 1000)
    setInterval(limpiarIdempotencia, 24 * 60 * 60 * 1000)
  })
  .catch((error) => {
    logger.error('Error conectando a la base de datos:', error)
  })
