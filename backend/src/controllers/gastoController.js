'use strict'

const { Op } = require('sequelize')
const sequelize = require('../config/database')
const Gasto = require('../models/Gasto')
const CajaTurno = require('../models/CajaTurno')
const MovimientoCaja = require('../models/MovimientoCaja')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { parsePaginacion } = require('../utils/paginacion')

const convertirANumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto
  }
  const numero = Number.parseFloat(valor)
  return Number.isNaN(numero) ? valorPorDefecto : numero
}

// Crea un gasto del negocio. Si el pago es en efectivo y el usuario tiene un
// turno de caja abierto, genera automáticamente el egreso en la caja (una sola
// digitación: el gasto queda en la rentabilidad Y en el arqueo del turno).
const crearGasto = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { categoria, descripcion, monto, fecha, metodoPago } = req.body
    const { clinicaId } = req.usuario
    const montoNumero = convertirANumero(monto, NaN)

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Monto invalido' })
    }

    let cajaTurnoId = null
    let movimientoCajaId = null

    if (metodoPago === 'efectivo') {
      const turno = await CajaTurno.findOne({
        where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      // Con turno abierto el efectivo sale de la caja: se registra el egreso
      // y se descuenta del esperado. Sin turno, el gasto igual se guarda
      // (pudo pagarse con efectivo que no estaba en la caja).
      if (turno) {
        const movimiento = await MovimientoCaja.create({
          tipo: 'egreso',
          monto: montoNumero,
          motivo: 'gasto_negocio',
          observaciones: `Gasto de negocio (${categoria})`,
          cajaTurnoId: turno.id,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction })

        await turno.increment('totalEgresosManuales', { by: montoNumero, transaction })

        cajaTurnoId = turno.id
        movimientoCajaId = movimiento.id
      }
    }

    const gasto = await Gasto.create({
      categoria,
      descripcion: descripcion || null,
      monto: montoNumero,
      fecha: fecha || new Date(),
      metodoPago,
      cajaTurnoId,
      movimientoCajaId,
      usuarioId: req.usuario.id,
      clinicaId,
    }, { transaction })

    await transaction.commit()

    await registrarAuditoria({
      accion: 'CREAR_GASTO',
      entidad: 'Gasto',
      entidadId: gasto.id,
      descripcion: `Gasto registrado (${categoria}) por $${montoNumero}. Pago: ${metodoPago}${movimientoCajaId ? ' (egreso de caja automático)' : ''}`,
      datosNuevos: { categoria, monto: montoNumero, metodoPago, cajaTurnoId, movimientoCajaId },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: movimientoCajaId
        ? 'Gasto registrado y descontado de la caja'
        : 'Gasto registrado',
      gasto,
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const listarGastos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const { fechaInicio, fechaFin, categoria, metodoPago, incluirAnulados } = req.query
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 })

    const where = { clinicaId }

    if (incluirAnulados !== 'true') where.anulado = false
    if (categoria) where.categoria = categoria
    if (metodoPago) where.metodoPago = metodoPago
    if (fechaInicio && fechaFin) {
      where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
    }

    const { count, rows } = await Gasto.findAndCountAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
      limit: limite,
      offset,
    })

    // Total del filtro actual (solo no anulados) para la cabecera de la lista.
    const totalMonto = await Gasto.sum('monto', {
      where: { ...where, anulado: false },
    })

    res.json({
      total: count,
      totalMonto: convertirANumero(totalMonto),
      paginas: Math.ceil(count / limite),
      paginaActual: pagina,
      gastos: rows,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Los gastos no se editan ni se borran: se anulan (libro auditable). Si el
// gasto había generado un egreso de caja y el turno sigue abierto, se crea un
// movimiento compensatorio de ingreso (el libro de caja también es inmutable).
const anularGasto = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { motivoAnulacion } = req.body
    const { clinicaId } = req.usuario

    if (!motivoAnulacion) {
      await transaction.rollback()
      return res.status(400).json({ message: 'El motivo de anulacion es obligatorio' })
    }

    const gasto = await Gasto.findOne({
      where: { id, clinicaId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!gasto) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Gasto no encontrado' })
    }

    if (gasto.anulado) {
      await transaction.rollback()
      return res.status(400).json({ message: 'El gasto ya esta anulado' })
    }

    let cajaCompensada = false
    if (gasto.movimientoCajaId && gasto.cajaTurnoId) {
      const turno = await CajaTurno.findOne({
        where: { id: gasto.cajaTurnoId, clinicaId, estado: 'abierto' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (turno) {
        await MovimientoCaja.create({
          tipo: 'ingreso',
          monto: convertirANumero(gasto.monto),
          motivo: 'gasto_negocio',
          observaciones: `Reverso por anulación de gasto (${gasto.categoria})`,
          cajaTurnoId: turno.id,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction })

        await turno.increment('totalIngresosManuales', {
          by: convertirANumero(gasto.monto),
          transaction,
        })
        cajaCompensada = true
      }
    }

    await gasto.update({ anulado: true, motivoAnulacion }, { transaction })
    await transaction.commit()

    await registrarAuditoria({
      accion: 'ANULAR_GASTO',
      entidad: 'Gasto',
      entidadId: gasto.id,
      descripcion: `Gasto anulado (${gasto.categoria}, $${gasto.monto}). Motivo: ${motivoAnulacion}`,
      datosAnteriores: { anulado: false },
      datosNuevos: { anulado: true, motivoAnulacion, cajaCompensada },
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Gasto anulado exitosamente', cajaCompensada })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  crearGasto,
  listarGastos,
  anularGasto,
}
