'use strict'

const { Op } = require('sequelize')
const sequelize = require('../config/database')
const CajaTurno = require('../models/CajaTurno')
const MovimientoCaja = require('../models/MovimientoCaja')
const Factura = require('../models/Factura')
const FacturaItem = require('../models/FacturaItem')
const Producto = require('../models/Producto')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { parsePaginacion } = require('../utils/paginacion')
const Clinica = require('../models/Clinica')
const {
  convertirANumero,
  esTurnoVencido,
  calcularCierreTurno,
  horaCierreDelDia,
  turnoFueraDeHorario,
} = require('../utils/turnoCaja')

const ROLES_ADMIN = ['admin', 'superadmin']

const esRolAdmin = (usuario) => {
  const roles = [usuario.rol, ...(usuario.rolesAdicionales || [])]
  return roles.some((rol) => ROLES_ADMIN.includes(rol))
}

const abrirTurno = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { montoInicial } = req.body
    const { clinicaId } = req.usuario
    const monto = convertirANumero(montoInicial, NaN)

    if (!Number.isFinite(monto) || monto < 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Monto inicial invalido' })
    }

    const turnoExistente = await CajaTurno.findOne({
      where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (turnoExistente) {
      await transaction.rollback()
      return res.status(409).json({
        message: 'Ya tienes un turno de caja abierto',
        turno: turnoExistente,
      })
    }

    const turno = await CajaTurno.create({
      montoInicial: monto,
      usuarioId: req.usuario.id,
      clinicaId,
      estado: 'abierto',
      fechaApertura: new Date(),
    }, { transaction })

    await transaction.commit()

    await registrarAuditoria({
      accion: 'ABRIR_TURNO_CAJA',
      entidad: 'CajaTurno',
      entidadId: turno.id,
      descripcion: `Turno de caja abierto con fondo inicial de $${monto}`,
      datosNuevos: { montoInicial: monto },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({ message: 'Turno de caja abierto', turno })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerTurnoActivo = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const turno = await CajaTurno.findOne({
      where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
    })

    if (!turno) {
      return res.json({ turno: null })
    }

    // El aviso de "ya cerramos" sale del horario de atencion que configura
    // cada clinica; si no lo tiene definido, simplemente no hay aviso.
    const clinica = await Clinica.findByPk(clinicaId, { attributes: ['id', 'horarioAtencion'] })
    const horarioAtencion = clinica?.horarioAtencion || null

    res.json({
      turno: {
        ...turno.toJSON(),
        vencido: esTurnoVencido(turno),
        fueraDeHorario: turnoFueraDeHorario(turno, horarioAtencion),
        horaCierre: horaCierreDelDia(horarioAtencion, new Date(turno.fechaApertura).getDay()),
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const listarMovimientosTurno = async (req, res) => {
  try {
    const { turnoId } = req.params
    const { clinicaId } = req.usuario

    const turno = await CajaTurno.findOne({ where: { id: turnoId, clinicaId } })

    if (!turno) {
      return res.status(404).json({ message: 'Turno no encontrado' })
    }

    if (!esRolAdmin(req.usuario) && turno.usuarioId !== req.usuario.id) {
      return res.status(403).json({ message: 'No tienes permiso para ver este turno' })
    }

    const movimientos = await MovimientoCaja.findAll({
      where: { cajaTurnoId: turnoId, clinicaId },
      order: [['createdAt', 'DESC']],
    })

    res.json({ movimientos })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const registrarMovimientoCaja = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { tipo, monto, motivo, observaciones } = req.body
    const { clinicaId } = req.usuario
    const montoNumero = convertirANumero(monto, NaN)

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Monto invalido' })
    }

    const turno = await CajaTurno.findOne({
      where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!turno) {
      await transaction.rollback()
      return res.status(409).json({ message: 'No tienes un turno de caja abierto' })
    }

    if (esTurnoVencido(turno)) {
      await transaction.rollback()
      return res.status(409).json({
        message: 'Tu turno de caja quedo abierto desde un dia anterior. Debes cerrarlo antes de continuar.',
        code: 'TURNO_VENCIDO',
      })
    }

    const movimiento = await MovimientoCaja.create({
      tipo,
      monto: montoNumero,
      motivo,
      observaciones: observaciones || null,
      cajaTurnoId: turno.id,
      usuarioId: req.usuario.id,
      clinicaId,
    }, { transaction })

    await turno.increment(
      tipo === 'ingreso' ? 'totalIngresosManuales' : 'totalEgresosManuales',
      { by: montoNumero, transaction }
    )

    await transaction.commit()

    await registrarAuditoria({
      accion: 'REGISTRAR_MOVIMIENTO_CAJA',
      entidad: 'MovimientoCaja',
      entidadId: movimiento.id,
      descripcion: `Movimiento de caja (${tipo}) por $${montoNumero}. Motivo: ${motivo}`,
      datosNuevos: { tipo, monto: montoNumero, motivo },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({ message: 'Movimiento registrado', movimiento })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const cerrarTurno = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { clinicaId } = req.usuario

    const turno = await CajaTurno.findOne({
      where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!turno) {
      await transaction.rollback()
      return res.status(409).json({ message: 'No tienes un turno de caja abierto' })
    }

    const resultado = calcularCierreTurno(turno, req.body)

    if (resultado.error) {
      await transaction.rollback()
      return res.status(resultado.error.status).json({ message: resultado.error.message })
    }

    const { diferencia, categoriaDiferencia, requiereRevisionAdmin } = resultado

    await turno.update({
      estado: 'cerrado',
      fechaCierre: new Date(),
      montoFinalContado: resultado.montoFinalContado,
      montoFinalEsperado: resultado.montoFinalEsperado,
      diferencia,
      categoriaDiferencia,
      observacionesCierre: resultado.observacionesCierre,
      requiereRevisionAdmin,
    }, { transaction })

    await transaction.commit()

    await registrarAuditoria({
      accion: 'CERRAR_TURNO_CAJA',
      entidad: 'CajaTurno',
      entidadId: turno.id,
      descripcion: `Turno de caja cerrado con diferencia de $${diferencia}`,
      datosNuevos: { diferencia, categoriaDiferencia, requiereRevisionAdmin },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Turno cerrado exitosamente',
      turno,
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Lista, para admin/superadmin, los turnos abiertos de toda la clinica cuya
// fechaApertura cae en un dia calendario anterior al de hoy (ver esTurnoVencido).
const listarTurnosVencidos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const turnosAbiertos = await CajaTurno.findAll({
      where: { clinicaId, estado: 'abierto' },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      order: [['fechaApertura', 'ASC']],
    })

    const turnosVencidos = turnosAbiertos.filter((turno) => esTurnoVencido(turno))

    res.json({ turnos: turnosVencidos })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Permite a un admin/superadmin cerrar el turno vencido de otro usuario (p.
// ej. si ya no tiene acceso para cerrarlo el mismo). Mismo calculo de
// descuadre que el autocierre; queda auditado que lo cerro un admin.
const cerrarTurnoAdmin = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { turnoId } = req.params
    const { clinicaId } = req.usuario

    const turno = await CajaTurno.findOne({
      where: { id: turnoId, clinicaId, estado: 'abierto' },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      transaction,
      // El include genera un LEFT JOIN y Postgres rechaza FOR UPDATE sobre el
      // lado nulable: se bloquea solo la fila de caja_turnos.
      lock: { level: transaction.LOCK.UPDATE, of: CajaTurno },
    })

    if (!turno) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Turno no encontrado o ya esta cerrado' })
    }

    // Este endpoint existe para destrabar turnos vencidos, no para cerrarle el
    // turno del dia a un cajero que sigue operando.
    if (!esTurnoVencido(turno)) {
      await transaction.rollback()
      return res.status(409).json({
        message: 'Solo puedes cerrar turnos que quedaron abiertos de un dia anterior',
        code: 'TURNO_NO_VENCIDO',
      })
    }

    const resultado = calcularCierreTurno(turno, req.body)

    if (resultado.error) {
      await transaction.rollback()
      return res.status(resultado.error.status).json({ message: resultado.error.message })
    }

    const { diferencia, categoriaDiferencia, requiereRevisionAdmin } = resultado
    const propietario = turno.usuario?.nombre || turno.usuarioId

    await turno.update({
      estado: 'cerrado',
      fechaCierre: new Date(),
      montoFinalContado: resultado.montoFinalContado,
      montoFinalEsperado: resultado.montoFinalEsperado,
      diferencia,
      categoriaDiferencia,
      observacionesCierre: resultado.observacionesCierre,
      requiereRevisionAdmin,
    }, { transaction })

    await transaction.commit()

    await registrarAuditoria({
      accion: 'CERRAR_TURNO_CAJA_ADMIN',
      entidad: 'CajaTurno',
      entidadId: turno.id,
      descripcion: `Turno vencido de ${propietario} cerrado por un administrador, con diferencia de $${diferencia}`,
      datosNuevos: { diferencia, categoriaDiferencia, requiereRevisionAdmin, cerradoPorAdmin: true },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Turno cerrado exitosamente',
      turno,
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const listarHistorialTurnos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const { fechaInicio, fechaFin, usuarioId } = req.query
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 })

    const where = { clinicaId, estado: 'cerrado' }

    if (!esRolAdmin(req.usuario)) {
      where.usuarioId = req.usuario.id
    } else if (usuarioId) {
      where.usuarioId = usuarioId
    }

    if (fechaInicio && fechaFin) {
      where.fechaCierre = { [Op.between]: [new Date(fechaInicio), new Date(fechaFin)] }
    }

    const { count, rows } = await CajaTurno.findAndCountAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
      order: [['fechaCierre', 'DESC']],
      limit: limite,
      offset,
    })

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: pagina,
      turnos: rows,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerDetalleTurno = async (req, res) => {
  try {
    const { turnoId } = req.params
    const { clinicaId } = req.usuario

    const turno = await CajaTurno.findOne({
      where: { id: turnoId, clinicaId },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
    })

    if (!turno) {
      return res.status(404).json({ message: 'Turno no encontrado' })
    }

    if (!esRolAdmin(req.usuario) && turno.usuarioId !== req.usuario.id) {
      return res.status(403).json({ message: 'No tienes permiso para ver este turno' })
    }

    const movimientos = await MovimientoCaja.findAll({
      where: { cajaTurnoId: turnoId, clinicaId },
      order: [['createdAt', 'DESC']],
    })

    // Trazabilidad de mermas: qué productos se vendieron/descontaron de stock
    // en este turno, construido desde FacturaItem + Factura.cajaTurnoId, sin
    // modificar MovimientoInventario (decisión de alcance del plan).
    // Solo productos: son los unicos items que descuentan stock al facturarse.
    // Los insumos clinicos no se venden — salen del inventario al cerrar la
    // historia clinica, no en la caja.
    const itemsVendidos = await FacturaItem.findAll({
      where: { tipo: 'producto' },
      include: [
        {
          model: Factura,
          as: 'factura',
          attributes: [],
          where: { cajaTurnoId: turnoId },
          required: true,
        },
        {
          model: Producto,
          as: 'producto',
          attributes: ['id', 'nombre', 'categoria'],
        },
      ],
    })

    const trazabilidadPorProducto = new Map()
    for (const item of itemsVendidos) {
      const key = item.productoId ? `producto:${item.productoId}` : 'producto:sin-referencia'

      const actual = trazabilidadPorProducto.get(key) || {
        productoId: item.productoId,
        tipo: item.tipo,
        nombre: item.producto?.nombre || 'Producto eliminado',
        categoria: item.producto?.categoria || null,
        cantidadVendida: 0,
      }
      actual.cantidadVendida += Number(item.cantidad)
      trazabilidadPorProducto.set(key, actual)
    }

    res.json({
      turno,
      movimientos,
      trazabilidadInventario: Array.from(trazabilidadPorProducto.values()),
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerReporteDescuadres = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const { fechaInicio, fechaFin, usuarioId } = req.query

    const ahora = new Date()
    const inicioPorDefecto = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finPorDefecto = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

    const where = {
      clinicaId,
      estado: 'cerrado',
      categoriaDiferencia: { [Op.ne]: null },
      fechaCierre: {
        [Op.between]: [
          fechaInicio ? new Date(fechaInicio) : inicioPorDefecto,
          fechaFin ? new Date(fechaFin) : finPorDefecto,
        ],
      },
    }

    if (usuarioId) where.usuarioId = usuarioId

    const filas = await CajaTurno.findAll({
      attributes: [
        'usuarioId',
        'categoriaDiferencia',
        [sequelize.fn('COUNT', sequelize.col('CajaTurno.id')), 'cantidadOcurrencias'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('CajaTurno.diferencia')), 0), 'sumaDiferencias'],
      ],
      include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }],
      where,
      group: ['CajaTurno.usuarioId', 'CajaTurno.categoriaDiferencia', 'usuario.id'],
      order: [[sequelize.literal('"cantidadOcurrencias"'), 'DESC']],
      raw: true,
      nest: true,
    })

    const reporte = filas.map((fila) => ({
      usuarioId: fila.usuarioId,
      usuarioNombre: fila.usuario?.nombre || null,
      categoriaDiferencia: fila.categoriaDiferencia,
      cantidadOcurrencias: Number(fila.cantidadOcurrencias || 0),
      sumaDiferencias: convertirANumero(fila.sumaDiferencias, 0),
    }))

    res.json({ reporte })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  abrirTurno,
  obtenerTurnoActivo,
  listarMovimientosTurno,
  registrarMovimientoCaja,
  cerrarTurno,
  listarTurnosVencidos,
  cerrarTurnoAdmin,
  listarHistorialTurnos,
  obtenerDetalleTurno,
  obtenerReporteDescuadres,
}
