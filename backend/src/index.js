const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const helmet = require('helmet')
const hpp = require('hpp')
//const xss = require('xss-clean')
const winston = require('winston')
const sequelize = require('./config/database')
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

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet())
app.use(hpp())
//app.use(xss())

// ── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// ── Ruta base ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a Bourgelat API' })
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
const PORT = process.env.PORT || 3000

sequelize.authenticate()
  .then(() => {
    logger.info('Conexión a la base de datos exitosa')
    return sequelize.sync({ alter: true })
  })
  .then(() => {
    logger.info('Tablas sincronizadas')
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