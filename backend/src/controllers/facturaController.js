const { Op } = require('sequelize')
const sequelize = require('../config/database')
const Factura = require('../models/Factura')
const FacturaItem = require('../models/FacturaItem')
const Producto = require('../models/Producto')
const MovimientoInventario = require('../models/MovimientoInventario')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { obtenerContextoFactusPorClinica } = require('../config/factusConfig')
const { solicitarTokenFactus, validarFacturaFactus } = require('../factusService')
const {
  obtenerNombrePlan,
  obtenerSuscripcionActivaClinica,
  suscripcionTieneFuncionalidad,
} = require('../services/suscripcionService')

const METODOS_PAGO_FACTUS = {
  efectivo: '10',
  transferencia: '47',
  nequi: '47',
  daviplata: '47',
  tarjeta_debito: '49',
  tarjeta_credito: '48',
  otro: 'ZZZ',
}

const TIPOS_DOCUMENTO_FACTUS = {
  CC: 3,
  CE: 5,
  NIT: 6,
  PP: 7,
}

const ORGANIZACIONES_JURIDICAS_FACTUS = {
  persona_juridica: '1',
  persona_natural: '2',
}

const DEFAULT_UNIT_MEASURE_ID = 70
const DEFAULT_STANDARD_CODE_ID = 1
const DEFAULT_PRODUCT_TRIBUTE_ID = 1
const DEFAULT_CUSTOMER_TRIBUTE_ID = '21'

const convertirANumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto
  }

  const numero = Number.parseFloat(valor)
  return Number.isNaN(numero) ? valorPorDefecto : numero
}

const convertirAEntero = (valor, valorPorDefecto = null) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto
  }

  const numero = Number.parseInt(valor, 10)
  return Number.isNaN(numero) ? valorPorDefecto : numero
}

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return ''
  return String(valor).trim()
}

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales
  return Math.round((convertirANumero(valor) + Number.EPSILON) * factor) / factor
}

const aCentavos = (valor) => Math.round(convertirANumero(valor) * 100)

const desdeCentavos = (valor) => redondear(valor / 100, 2)

const formatearPorcentaje = (valor) => redondear(valor, 6)

const generarNumeroFactura = async (clinicaId, transaction) => {
  await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
    replacements: { lockKey: `factura:${clinicaId}` },
    transaction,
  })

  const ultima = await Factura.findOne({
    where: { clinicaId },
    order: [['createdAt', 'DESC']],
    transaction,
  })

  if (!ultima) return 'FAC-0001'

  const match = String(ultima.numero || '').match(/(\d+)$/)
  const numero = (match ? parseInt(match[1], 10) : 0) + 1
  return `FAC-${String(numero).padStart(4, '0')}`
}

const obtenerFacturaDetallada = async (id, clinicaId) => {
  return Factura.findOne({
    where: { id, clinicaId },
    include: [
      {
        model: Propietario,
        as: 'propietario',
        attributes: [
          'id',
          'nombre',
          'tipoDocumento',
          'numeroDocumento',
          'email',
          'telefono',
          'direccion',
          'ciudad',
          'razonSocial',
          'nombreComercial',
          'tipoPersona',
          'digitoVerificacion',
          'codigoPostal',
          'municipioId',
          'tipoDocumentoFacturacionId',
          'organizacionJuridicaId',
          'tributoId',
        ],
      },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      {
        model: FacturaItem,
        as: 'items',
        include: [
          {
            model: Producto,
            as: 'producto',
            attributes: ['id', 'nombre', 'codigoBarras', 'unidadMedida'],
          },
        ],
      },
    ],
    order: [[{ model: FacturaItem, as: 'items' }, 'createdAt', 'ASC']],
  })
}

const distribuirDescuentoGeneral = (items, descuentoGeneral) => {
  const descuentoTotalCentavos = aCentavos(descuentoGeneral)

  if (descuentoTotalCentavos <= 0) {
    return items.map(() => 0)
  }

  const bases = items.map(item => Math.max(aCentavos(item.subtotal), 0))
  const sumaBases = bases.reduce((acumulado, valor) => acumulado + valor, 0)

  if (sumaBases <= 0) {
    const repartoBase = Math.floor(descuentoTotalCentavos / items.length)
    let restante = descuentoTotalCentavos

    return items.map((item, index) => {
      const asignado = index === items.length - 1 ? restante : repartoBase
      restante -= asignado
      return asignado
    })
  }

  let restante = descuentoTotalCentavos

  return items.map((item, index) => {
    if (index === items.length - 1) {
      return restante
    }

    const asignado = Math.floor((descuentoTotalCentavos * bases[index]) / sumaBases)
    restante -= asignado
    return asignado
  })
}

const resolverTipoDocumentoFactus = (propietario) => {
  return propietario.tipoDocumentoFacturacionId ||
    TIPOS_DOCUMENTO_FACTUS[propietario.tipoDocumento] ||
    TIPOS_DOCUMENTO_FACTUS.CC
}

const resolverOrganizacionJuridicaFactus = (propietario) => {
  if (propietario.organizacionJuridicaId) {
    return String(propietario.organizacionJuridicaId)
  }

  if (propietario.tipoDocumento === 'NIT') {
    return ORGANIZACIONES_JURIDICAS_FACTUS.persona_juridica
  }

  return ORGANIZACIONES_JURIDICAS_FACTUS[propietario.tipoPersona] ||
    ORGANIZACIONES_JURIDICAS_FACTUS.persona_natural
}

const resolverTributoClienteFactus = (propietario) => {
  return limpiarTexto(propietario.tributoId) || DEFAULT_CUSTOMER_TRIBUTE_ID
}

const resolverMetodoPagoFactus = (factura, configuracionEfectiva, metodoPagoCodigo) => {
  if (limpiarTexto(metodoPagoCodigo)) {
    return limpiarTexto(metodoPagoCodigo)
  }

  return METODOS_PAGO_FACTUS[factura.metodoPago] ||
    limpiarTexto(configuracionEfectiva.metodoPagoCodigo) ||
    '10'
}

const obtenerCamposFiscalesPropietarioFaltantes = (propietario) => {
  const nombre = limpiarTexto(propietario.nombre)
  const razonSocial = limpiarTexto(propietario.razonSocial)
  const organizacionJuridicaId = resolverOrganizacionJuridicaFactus(propietario)
  const campos = [
    ['numeroDocumento', limpiarTexto(propietario.numeroDocumento)],
    ['email', limpiarTexto(propietario.email)],
    ['telefono', limpiarTexto(propietario.telefono)],
    ['direccion', limpiarTexto(propietario.direccion)],
    ['municipioId', propietario.municipioId],
    ['nombre', nombre || razonSocial],
    ['tipoDocumentoFacturacionId', resolverTipoDocumentoFactus(propietario)],
    ['organizacionJuridicaId', organizacionJuridicaId],
    ['tributoId', resolverTributoClienteFactus(propietario)],
  ]

  return campos
    .filter(([, valor]) => valor === undefined || valor === null || valor === '')
    .map(([campo]) => campo)
}

const validarFacturaParaEmision = (factura) => {
  if (!factura) {
    const error = new Error('Factura no encontrada')
    error.status = 404
    throw error
  }

  if (factura.estado === 'anulada') {
    const error = new Error('No se puede emitir electronicamente una factura anulada')
    error.status = 400
    throw error
  }

  if (!['emitida', 'pagada'].includes(factura.estado)) {
    const error = new Error('Solo se pueden emitir electronicamente facturas emitidas o pagadas')
    error.status = 400
    throw error
  }

  if (!factura.items?.length) {
    const error = new Error('La factura no tiene items para emitir electronicamente')
    error.status = 400
    throw error
  }

  if (factura.estadoElectronico === 'validada' && factura.cufe) {
    const error = new Error('La factura ya fue validada electronicamente')
    error.status = 409
    throw error
  }
}

const construirClienteFactus = (propietario) => {
  const organizacionJuridicaId = resolverOrganizacionJuridicaFactus(propietario)
  const tipoDocumentoFacturacionId = resolverTipoDocumentoFactus(propietario)
  const esPersonaJuridica = organizacionJuridicaId === ORGANIZACIONES_JURIDICAS_FACTUS.persona_juridica
  const razonSocial = limpiarTexto(propietario.razonSocial) || limpiarTexto(propietario.nombre)
  const nombreContacto = limpiarTexto(propietario.nombre) || razonSocial

  return {
    identification: limpiarTexto(propietario.numeroDocumento),
    dv: limpiarTexto(propietario.digitoVerificacion) || '',
    company: esPersonaJuridica ? razonSocial : '',
    trade_name: esPersonaJuridica ? (limpiarTexto(propietario.nombreComercial) || razonSocial) : '',
    names: esPersonaJuridica ? razonSocial : nombreContacto,
    address: limpiarTexto(propietario.direccion),
    email: limpiarTexto(propietario.email),
    phone: limpiarTexto(propietario.telefono),
    legal_organization_id: organizacionJuridicaId,
    tribute_id: resolverTributoClienteFactus(propietario),
    identification_document_id: tipoDocumentoFacturacionId,
    municipality_id: convertirAEntero(propietario.municipioId),
  }
}

const construirItemsFactus = (factura) => {
  const descuentosGeneralesProrrateados = distribuirDescuentoGeneral(factura.items, factura.descuento)

  return factura.items.map((item, index) => {
    const cantidad = convertirANumero(item.cantidad, 1)
    const precioUnitario = convertirANumero(item.precioUnitario)
    const valorBrutoCentavos = aCentavos(cantidad * precioUnitario)
    const descuentoItemCentavos = aCentavos(item.descuento)
    const descuentoGeneralCentavos = descuentosGeneralesProrrateados[index] || 0
    const descuentoTotalCentavos = Math.min(
      valorBrutoCentavos,
      descuentoItemCentavos + descuentoGeneralCentavos
    )
    const descuentoRate = valorBrutoCentavos > 0
      ? formatearPorcentaje((descuentoTotalCentavos / valorBrutoCentavos) * 100)
      : 0

    return {
      code_reference: limpiarTexto(item.producto?.codigoBarras) ||
        limpiarTexto(item.productoId) ||
        `${factura.numero}-ITEM-${index + 1}`,
      name: limpiarTexto(item.descripcion),
      quantity: cantidad,
      discount_rate: descuentoRate,
      price: redondear(precioUnitario, 2),
      tax_rate: '0.00',
      unit_measure_id: DEFAULT_UNIT_MEASURE_ID,
      standard_code_id: DEFAULT_STANDARD_CODE_ID,
      is_excluded: 1,
      tribute_id: DEFAULT_PRODUCT_TRIBUTE_ID,
      withholding_taxes: [],
    }
  })
}

const construirPayloadFacturaFactus = ({
  factura,
  configuracionEfectiva,
  rangoNumeracionId,
  documentoCodigo,
  formaPagoCodigo,
  metodoPagoCodigo,
  enviarEmail,
  fechaVencimientoPago,
}) => {
  const payload = {
    document: documentoCodigo,
    numbering_range_id: rangoNumeracionId,
    reference_code: factura.numero,
    observation: limpiarTexto(factura.observaciones) || undefined,
    payment_form: formaPagoCodigo,
    payment_method_code: metodoPagoCodigo,
    send_email: enviarEmail ? 1 : 0,
    customer: construirClienteFactus(factura.propietario),
    items: construirItemsFactus(factura),
  }

  if (fechaVencimientoPago) {
    payload.payment_due_date = fechaVencimientoPago
  }

  return payload
}

const limpiarRespuestaFactus = (respuesta) => {
  if (!respuesta) return null

  const clon = JSON.parse(JSON.stringify(respuesta))

  if (clon?.data?.bill?.qr_image) {
    delete clon.data.bill.qr_image
  }

  return clon
}

const parsearFechaFactus = (valor) => {
  if (!valor) return null

  const coincidencia = String(valor).match(
    /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) (AM|PM)$/i
  )

  if (!coincidencia) {
    const fecha = new Date(valor)
    return Number.isNaN(fecha.getTime()) ? null : fecha
  }

  const [, dia, mes, anio, horasTexto, minutos, segundos, ampmTexto] = coincidencia
  let horas = Number.parseInt(horasTexto, 10)
  const ampm = ampmTexto.toUpperCase()

  if (ampm === 'PM' && horas !== 12) horas += 12
  if (ampm === 'AM' && horas === 12) horas = 0

  const fecha = new Date(
    `${anio}-${mes}-${dia}T${String(horas).padStart(2, '0')}:${minutos}:${segundos}-05:00`
  )

  return Number.isNaN(fecha.getTime()) ? null : fecha
}

const extraerMensajeFactus = (respuesta) => {
  if (!respuesta) return ''

  if (limpiarTexto(respuesta.message)) {
    return limpiarTexto(respuesta.message)
  }

  if (limpiarTexto(respuesta.data?.message)) {
    return limpiarTexto(respuesta.data.message)
  }

  return ''
}

const crearFactura = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const {
      propietarioId,
      items,
      metodoPago,
      observaciones,
      descuentoGeneral,
      usuarioId,
      emitirElectronica = false,
      documentoElectronico = '01',
      rangoNumeracionId = null,
    } = req.body
    const { clinicaId } = req.usuario

    if (!propietarioId || !items || items.length === 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Propietario e items son obligatorios' })
    }

    if (emitirElectronica) {
      const { suscripcion } = await obtenerSuscripcionActivaClinica(clinicaId)

      if (!suscripcionTieneFuncionalidad(suscripcion, 'facturacion_electronica')) {
        await transaction.rollback()
        return res.status(403).json({
          message: `Tu plan ${obtenerNombrePlan(suscripcion.plan)} no incluye facturacion electronica. Crea la factura interna y cambia de plan para emitirla electronicamente.`,
          code: 'PLAN_FEATURE_REQUIRED',
          plan: suscripcion.plan,
          funcionalidadesFaltantes: ['facturacion_electronica'],
        })
      }
    }

    const propietario = await Propietario.findOne({
      where: { id: propietarioId, clinicaId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!propietario) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Propietario no encontrado' })
    }

    let subtotal = 0
    const itemsCalculados = []

    for (const item of items) {
      const cantidad = convertirANumero(item.cantidad, NaN)
      const precioUnitario = convertirANumero(item.precioUnitario, NaN)
      const descuentoItem = convertirANumero(item.descuento, 0)

      if (
        !limpiarTexto(item.descripcion) ||
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(precioUnitario) ||
        precioUnitario < 0 ||
        descuentoItem < 0
      ) {
        await transaction.rollback()
        return res.status(400).json({
          message: 'Cada item debe tener descripcion, cantidad valida, precio no negativo y descuento valido',
        })
      }

      let producto = null
      if (item.tipo === 'producto' && item.productoId) {
        if (!Number.isInteger(cantidad)) {
          await transaction.rollback()
          return res.status(400).json({
            message: `La cantidad de producto debe ser entera: ${item.descripcion}`,
          })
        }

        producto = await Producto.findOne({
          where: { id: item.productoId, clinicaId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })

        if (!producto) {
          await transaction.rollback()
          return res.status(404).json({ message: `Producto no encontrado: ${item.descripcion}` })
        }

        if (Number(producto.stock) < cantidad) {
          await transaction.rollback()
          return res.status(400).json({ message: `Stock insuficiente para: ${producto.nombre}` })
        }
      }

      const itemSubtotal = Math.max((precioUnitario * cantidad) - descuentoItem, 0)
      subtotal += itemSubtotal
      itemsCalculados.push({
        ...item,
        cantidad,
        precioUnitario,
        descuento: descuentoItem,
        subtotal: itemSubtotal,
        producto,
      })
    }

    const descuento = Math.min(convertirANumero(descuentoGeneral, 0), subtotal)
    const baseGravable = subtotal - descuento
    const impuesto = 0
    const total = baseGravable + impuesto
    const numero = await generarNumeroFactura(clinicaId, transaction)

    const factura = await Factura.create({
      numero,
      fecha: new Date(),
      estado: 'emitida',
      subtotal,
      descuento,
      impuesto,
      total,
      metodoPago,
      observaciones,
      proveedorElectronico: emitirElectronica ? 'factus' : null,
      estadoElectronico: emitirElectronica ? 'pendiente' : 'no_aplica',
      documentoElectronico: emitirElectronica ? documentoElectronico : null,
      rangoNumeracionId: emitirElectronica ? rangoNumeracionId : null,
      propietarioId,
      usuarioId: usuarioId || req.usuario.id,
      clinicaId,
    }, { transaction })

    for (const item of itemsCalculados) {
      await FacturaItem.create({
        descripcion: item.descripcion,
        tipo: item.tipo || 'servicio',
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento || 0,
        subtotal: item.subtotal,
        productoId: item.productoId || null,
        facturaId: factura.id,
      }, { transaction })

      if (item.tipo === 'producto' && item.producto) {
        const stockAnterior = Number(item.producto.stock)
        const stockNuevo = stockAnterior - item.cantidad

        await item.producto.update(
          { stock: stockNuevo },
          { transaction }
        )

        await MovimientoInventario.create({
          tipo: 'salida',
          cantidad: item.cantidad,
          stockAnterior,
          stockNuevo,
          motivo: 'venta',
          observaciones: `Salida por factura ${numero}`,
          precioUnitario: item.precioUnitario,
          productoId: item.producto.id,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction })
      }
    }

    await transaction.commit()

    const facturaCompleta = await obtenerFacturaDetallada(factura.id, clinicaId)

    await registrarAuditoria({
      accion: 'CREAR_FACTURA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Factura ${numero} creada por $${total}`,
      datosNuevos: { numero, total, metodoPago, propietarioId },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Factura creada exitosamente',
      factura: facturaCompleta,
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerFacturas = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const { fechaInicio, fechaFin, estado, pagina = 1, limite = 20, buscar } = req.query

    const where = { clinicaId }
    if (estado) where.estado = estado
    if (fechaInicio && fechaFin) {
      where.fecha = { [Op.between]: [fechaInicio, fechaFin] }
    }

    const textoBusqueda = limpiarTexto(buscar)
    if (textoBusqueda) {
      where[Op.or] = [
        { numero: { [Op.iLike]: `%${textoBusqueda}%` } },
        { '$propietario.nombre$': { [Op.iLike]: `%${textoBusqueda}%` } },
        { '$usuario.nombre$': { [Op.iLike]: `%${textoBusqueda}%` } },
      ]
    }

    const limiteNumero = parseInt(limite, 10)
    const paginaNumero = parseInt(pagina, 10)
    const offset = (paginaNumero - 1) * limiteNumero

    const includeListado = [
      { model: Propietario, as: 'propietario', attributes: ['id', 'nombre'], required: false },
      { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'], required: false },
    ]
    const includeResumen = textoBusqueda
      ? [
          { model: Propietario, as: 'propietario', attributes: [], required: false },
          { model: Usuario, as: 'usuario', attributes: [], required: false },
        ]
      : []

    const [{ count, rows }, resumenEstadosRows, resumenElectronicoRows] = await Promise.all([
      Factura.findAndCountAll({
        where,
        limit: limiteNumero,
        offset,
        order: [['createdAt', 'DESC']],
        include: includeListado,
        distinct: true,
        subQuery: false,
      }),
      Factura.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('Factura.id')), 'cantidad'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('Factura.total')), 0), 'monto'],
        ],
        where,
        include: includeResumen,
        group: ['Factura.estado'],
        raw: true,
        subQuery: false,
      }),
      Factura.findAll({
        attributes: [
          'estadoElectronico',
          [sequelize.fn('COUNT', sequelize.col('Factura.id')), 'cantidad'],
        ],
        where,
        include: includeResumen,
        group: ['Factura.estadoElectronico'],
        raw: true,
        subQuery: false,
      }),
    ])

    const resumenEstados = resumenEstadosRows.reduce((acc, row) => {
      acc[row.estado] = {
        cantidad: Number(row.cantidad || 0),
        monto: convertirANumero(row.monto, 0),
      }
      return acc
    }, {})

    const resumenElectronico = resumenElectronicoRows.reduce((acc, row) => {
      acc[row.estadoElectronico] = Number(row.cantidad || 0)
      return acc
    }, {})

    res.json({
      total: count,
      paginas: Math.ceil(count / limiteNumero),
      paginaActual: paginaNumero,
      resumenEstados,
      resumenElectronico,
      facturas: rows,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const factura = await obtenerFacturaDetallada(id, clinicaId)

    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' })
    }

    res.json({ factura })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const emitirFacturaElectronica = async (req, res) => {
  let payloadFactus = null

  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const {
      rangoNumeracionId,
      documentoCodigo,
      formaPagoCodigo,
      metodoPagoCodigo,
      enviarEmail,
      fechaVencimientoPago,
    } = req.body || {}

    const factura = await obtenerFacturaDetallada(id, clinicaId)
    validarFacturaParaEmision(factura)

    const camposFaltantesPropietario = obtenerCamposFiscalesPropietarioFaltantes(factura.propietario)
    if (camposFaltantesPropietario.length > 0) {
      return res.status(400).json({
        message: 'El propietario no tiene toda la informacion requerida para facturacion electronica',
        camposFaltantes: camposFaltantesPropietario,
      })
    }

    const { integracion, configuracionEfectiva } = await obtenerContextoFactusPorClinica(clinicaId)

    if (!configuracionEfectiva.activa) {
      return res.status(400).json({
        message: 'La integracion de Factus no esta activa para esta clinica',
      })
    }

    if (!configuracionEfectiva.credencialesCompletas) {
      return res.status(400).json({
        message: 'Faltan credenciales de Factus para emitir electronicamente',
      })
    }

    const rangoEfectivo = convertirAEntero(
      rangoNumeracionId ?? factura.rangoNumeracionId ?? configuracionEfectiva.rangoNumeracionId
    )
    const documentoEfectivo = limpiarTexto(
      documentoCodigo || factura.documentoElectronico || configuracionEfectiva.documentoCodigo || '01'
    )
    const formaPagoEfectiva = limpiarTexto(formaPagoCodigo || configuracionEfectiva.formaPagoCodigo || '1')
    const metodoPagoEfectivo = resolverMetodoPagoFactus(
      factura,
      configuracionEfectiva,
      metodoPagoCodigo
    )
    const enviarEmailEfectivo = typeof enviarEmail === 'boolean'
      ? enviarEmail
      : Boolean(configuracionEfectiva.enviarEmail)

    if (!rangoEfectivo) {
      return res.status(400).json({
        message: 'No hay un rango de numeracion configurado para Factus',
      })
    }

    if (formaPagoEfectiva === '2' && !fechaVencimientoPago) {
      return res.status(400).json({
        message: 'La fecha de vencimiento es obligatoria cuando la forma de pago es credito',
      })
    }

    payloadFactus = construirPayloadFacturaFactus({
      factura,
      configuracionEfectiva,
      rangoNumeracionId: rangoEfectivo,
      documentoCodigo: documentoEfectivo,
      formaPagoCodigo: formaPagoEfectiva,
      metodoPagoCodigo: metodoPagoEfectivo,
      enviarEmail: enviarEmailEfectivo,
      fechaVencimientoPago,
    })

    const tokenFactus = await solicitarTokenFactus({
      baseUrl: configuracionEfectiva.baseUrl,
      clientId: configuracionEfectiva.clientId,
      clientSecret: configuracionEfectiva.clientSecret,
      username: configuracionEfectiva.username,
      password: configuracionEfectiva.password,
    })

    const respuestaFactus = await validarFacturaFactus({
      baseUrl: configuracionEfectiva.baseUrl,
      token: tokenFactus.access_token,
      payload: payloadFactus,
    })

    const respuestaLimpia = limpiarRespuestaFactus(respuestaFactus)
    const bill = respuestaLimpia?.data?.bill || {}
    const tieneErroresFactus = Boolean(bill.errors && Object.keys(bill.errors).length > 0)
    const mensajeElectronico = [
      extraerMensajeFactus(respuestaLimpia),
      tieneErroresFactus ? `Advertencias DIAN: ${Object.values(bill.errors).join(' | ')}` : '',
    ].filter(Boolean).join(' | ')

    await factura.update({
      proveedorElectronico: 'factus',
      estadoElectronico: 'validada',
      documentoElectronico: documentoEfectivo,
      rangoNumeracionId: rangoEfectivo,
      referenciaExterna: limpiarTexto(bill.id || bill.number || factura.numero) || null,
      cufe: limpiarTexto(bill.cufe) || null,
      fechaEnvioElectronico: parsearFechaFactus(bill.created_at) || new Date(),
      fechaValidacionElectronica: parsearFechaFactus(bill.validated) || new Date(),
      mensajeElectronico: mensajeElectronico || 'Factura validada electronicamente',
      payloadElectronico: payloadFactus,
      respuestaElectronica: respuestaLimpia,
    })

    if (integracion) {
      await integracion.update({
        ultimoChequeo: new Date(),
        ultimoEstadoChequeo: 'exitoso',
        ultimoMensajeChequeo: `Factura ${factura.numero} emitida y validada en Factus`,
      })
    }

    await registrarAuditoria({
      accion: 'EMITIR_FACTURA_ELECTRONICA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Factura ${factura.numero} validada electronicamente en Factus`,
      datosAnteriores: {
        estadoElectronico: factura.estadoElectronico,
      },
      datosNuevos: {
        estadoElectronico: 'validada',
        referenciaExterna: bill.id || bill.number || null,
        cufe: bill.cufe || null,
      },
      req,
      resultado: 'exitoso',
    })

    const facturaActualizada = await obtenerFacturaDetallada(factura.id, clinicaId)

    res.json({
      message: 'Factura emitida electronicamente en Factus',
      factura: facturaActualizada,
      factus: {
        id: bill.id || null,
        numero: bill.number || null,
        cufe: bill.cufe || null,
        publicUrl: bill.public_url || null,
        validadaEn: bill.validated || null,
        advertencias: bill.errors || {},
      },
    })
  } catch (error) {
    const status = error.status || 400

    try {
      if (req.params?.id && req.usuario?.clinicaId) {
        const factura = await Factura.findOne({
          where: { id: req.params.id, clinicaId: req.usuario.clinicaId },
        })

        if (factura) {
          await factura.update({
            proveedorElectronico: 'factus',
            estadoElectronico: status === 422 ? 'rechazada' : 'error',
            mensajeElectronico: error.message,
            payloadElectronico: payloadFactus,
            respuestaElectronica: limpiarRespuestaFactus(error.payload) || null,
          })
        }
      }
    } catch {
      // Evitar que falle la respuesta principal si no se puede guardar el estado local
    }

    await registrarAuditoria({
      accion: 'EMITIR_FACTURA_ELECTRONICA',
      entidad: 'Factura',
      entidadId: req.params?.id,
      descripcion: `Fallo al emitir factura electronica: ${error.message}`,
      req,
      resultado: 'fallido',
    })

    res.status(status).json({
      message: 'No fue posible emitir la factura electronica',
      error: error.message,
      payload: error.payload || null,
    })
  }
}

const anularFactura = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const { motivoAnulacion } = req.body

    if (!motivoAnulacion) {
      await transaction.rollback()
      return res.status(400).json({ message: 'El motivo de anulacion es obligatorio' })
    }

    const factura = await Factura.findOne({
      where: { id, clinicaId },
      include: [{ model: FacturaItem, as: 'items' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!factura) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Factura no encontrada' })
    }

    if (factura.estado === 'anulada') {
      await transaction.rollback()
      return res.status(400).json({ message: 'La factura ya esta anulada' })
    }

    if (factura.estadoElectronico === 'validada' && factura.cufe) {
      await transaction.rollback()
      return res.status(409).json({
        message:
          'La factura ya fue validada electronicamente. Para revertirla se requiere una nota credito o un flujo tributario controlado.',
      })
    }

    for (const item of factura.items) {
      if (item.tipo === 'producto' && item.productoId) {
        const producto = await Producto.findOne({
          where: { id: item.productoId, clinicaId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })

        if (producto) {
          const cantidad = convertirANumero(item.cantidad)
          const stockAnterior = Number(producto.stock)
          const stockNuevo = stockAnterior + cantidad

          await producto.update(
            { stock: stockNuevo },
            { transaction }
          )

          await MovimientoInventario.create({
            tipo: 'entrada',
            cantidad,
            stockAnterior,
            stockNuevo,
            motivo: 'devolucion',
            observaciones: `Reingreso por anulacion de factura ${factura.numero}`,
            precioUnitario: item.precioUnitario,
            productoId: producto.id,
            usuarioId: req.usuario.id,
            clinicaId,
          }, { transaction })
        }
      }
    }

    await factura.update({ estado: 'anulada', motivoAnulacion }, { transaction })
    await transaction.commit()

    await registrarAuditoria({
      accion: 'ANULAR_FACTURA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Factura ${factura.numero} anulada. Motivo: ${motivoAnulacion}`,
      datosAnteriores: { estado: 'emitida' },
      datosNuevos: { estado: 'anulada', motivoAnulacion },
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Factura anulada exitosamente' })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  crearFactura,
  obtenerFacturas,
  obtenerFactura,
  emitirFacturaElectronica,
  anularFactura,
}
