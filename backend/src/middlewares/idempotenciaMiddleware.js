const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { DataTypes, Op } = require('sequelize')
const sequelize = require('../config/database')
const logger = require('../utils/logger')
const { obtenerAccessTokenRequest } = require('../config/cookies')

// La idempotencia corre antes de la autenticacion por ruta, asi que derivamos
// el "duenio" de la clave del access token. Esto evita que un atacante con la
// Idempotency-Key de otra clinica recupere su respuesta cacheada (fuga cross-tenant)
// o que la respuesta cacheada se sirva a un principal distinto.
const obtenerPrincipalIdempotencia = (req) => {
  const token = obtenerAccessTokenRequest(req)

  if (!token) {
    return 'anon'
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return `u:${decoded.id}:c:${decoded.clinicaId || 'none'}`
  } catch (error) {
    // Token presente pero invalido/expirado: aislamos por hash del token para
    // no colisionar nunca con la clave de un usuario valido.
    return `t:${crypto.createHash('sha256').update(token).digest('hex')}`
  }
}

const IdempotenciaKey = sequelize.define('IdempotenciaKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  clave: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  respuesta: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  expiracion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'idempotencia_keys',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['clave'] },
    { fields: ['expiracion'] },
  ],
})

const idempotencia = async (req, res, next) => {
  const claveIdempotencia = req.headers['idempotency-key']

  if (!claveIdempotencia) return next()

  const partesClave = [
    obtenerPrincipalIdempotencia(req),
    req.method,
    req.originalUrl || req.url || '/',
    String(claveIdempotencia).trim(),
  ]
  const claveScoped = crypto
    .createHash('sha256')
    .update(partesClave.join(':'))
    .digest('hex')

  try {
    // Buscar si ya existe esa clave
    const existente = await IdempotenciaKey.findOne({
      where: {
        clave: claveScoped,
        expiracion: { [Op.gt]: new Date() },
      },
    })

    if (existente) {
      return res.status(existente.status).json(existente.respuesta)
    }

    // Interceptar la respuesta para guardarla
    const jsonOriginal = res.json.bind(res)
    res.json = async (data) => {
      try {
        const expiracion = new Date()
        expiracion.setHours(expiracion.getHours() + 24)

        await IdempotenciaKey.create({
          clave: claveScoped,
          status: res.statusCode,
          respuesta: data,
          expiracion,
        })
      } catch (error) {
        // No interrumpir si falla el guardado
        logger.error({ contexto: 'idempotencia-guardado', mensaje: error.message })
      }
      return jsonOriginal(data)
    }

    next()
  } catch (error) {
    logger.error({ contexto: 'idempotencia', mensaje: error.message })
    next()
  }
}

module.exports = { idempotencia, IdempotenciaKey }
