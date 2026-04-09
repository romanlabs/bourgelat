const crypto = require('crypto')
const { DataTypes, Op } = require('sequelize')
const sequelize = require('../config/database')

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
        console.error('Error guardando idempotencia:', error.message)
      }
      return jsonOriginal(data)
    }

    next()
  } catch (error) {
    console.error('Error en middleware de idempotencia:', error.message)
    next()
  }
}

module.exports = { idempotencia, IdempotenciaKey }
