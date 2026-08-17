const { Op } = require('sequelize')
const sequelize = require('../config/database')
const Factura = require('../models/Factura')
const FacturaItem = require('../models/FacturaItem')
const Producto = require('../models/Producto')
const MovimientoInventario = require('../models/MovimientoInventario')
const ServicioClinico = require('../models/ServicioClinico')
const ServicioClinicoInsumo = require('../models/ServicioClinicoInsumo')
const InsumoClinico = require('../models/InsumoClinico')
const MovimientoInventarioClinico = require('../models/MovimientoInventarioClinico')
const HistoriaClinica = require('../models/HistoriaClinica')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const CajaTurno = require('../models/CajaTurno')
const AbonoFactura = require('../models/AbonoFactura')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { obtenerContextoFactusPorClinica } = require('../config/factusConfig')
const {
  solicitarTokenFactus,
  validarFacturaFactus,
  descargarPdfFactura,
  descargarXmlFactura,
} = require('../services/factusService')
const {
  obtenerNombrePlan,
  obtenerSuscripcionActivaClinica,
  suscripcionTieneFuncionalidad,
} = require('../services/suscripcionService')
const { parsePaginacion } = require('../utils/paginacion')

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

const DEFAULT_UNIT_MEASURE_CODE = '94'
const DEFAULT_STANDARD_CODE = '999'
const DEFAULT_CUSTOMER_TRIBUTE_CODE = 'ZZ'

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

const { limpiarTexto } = require('../utils/normalizar')

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
  return limpiarTexto(propietario.tributoId) || DEFAULT_CUSTOMER_TRIBUTE_CODE
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
    legal_organization_code: organizacionJuridicaId,
    tribute_code: resolverTributoClienteFactus(propietario),
    identification_document_code: String(tipoDocumentoFacturacionId),
    municipality_code: limpiarTexto(propietario.municipioId) || undefined,
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
      quantity: String(cantidad),
      discount_rate: String(descuentoRate),
      price: String(redondear(precioUnitario, 2)),
      unit_measure_code: DEFAULT_UNIT_MEASURE_CODE,
      standard_code: DEFAULT_STANDARD_CODE,
      taxes: [{ code: '01', rate: '0.00', is_excluded: true }],
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
  const pagoEntry = {
    payment_form: formaPagoCodigo,
    payment_method_code: metodoPagoCodigo,
    amount: String(redondear(factura.total, 2)),
  }
  if (formaPagoCodigo === '2' && fechaVencimientoPago) {
    pagoEntry.due_date = fechaVencimientoPago
  }

  const payload = {
    numbering_range_id: rangoNumeracionId,
    reference_code: factura.numero,
    document: documentoCodigo,
    observation: limpiarTexto(factura.observaciones) || undefined,
    send_email: enviarEmail ? 1 : 0,
    payment_details: [pagoEntry],
    customer: construirClienteFactus(factura.propietario),
    items: construirItemsFactus(factura),
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
      historiaClinicaId = null,
    } = req.body
    const { clinicaId } = req.usuario

    if (!items || items.length === 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'La factura debe tener al menos un item' })
    }

    if (emitirElectronica && !propietarioId) {
      await transaction.rollback()
      return res.status(400).json({
        message: 'La facturacion electronica requiere un cliente con datos fiscales. Selecciona un tutor o crea la factura interna.',
      })
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

    if (propietarioId) {
      const propietario = await Propietario.findOne({
        where: { id: propietarioId, clinicaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (!propietario) {
        await transaction.rollback()
        return res.status(404).json({ message: 'Propietario no encontrado' })
      }
    }

    // Cobro de una consulta: el lock evita que dos cajeros facturen la misma
    // historia al tiempo y la cobren dos veces.
    let historiaAFacturar = null
    if (historiaClinicaId) {
      historiaAFacturar = await HistoriaClinica.findOne({
        where: { id: historiaClinicaId, clinicaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (!historiaAFacturar) {
        await transaction.rollback()
        return res.status(404).json({ message: 'Historia clinica no encontrada' })
      }

      if (historiaAFacturar.facturaId) {
        await transaction.rollback()
        return res.status(409).json({
          message: 'Esta consulta ya fue facturada',
          code: 'HISTORIA_YA_FACTURADA',
          facturaId: historiaAFacturar.facturaId,
        })
      }

      if (!historiaAFacturar.bloqueada) {
        await transaction.rollback()
        return res.status(400).json({
          message: 'Cierra la historia clinica antes de facturarla',
          code: 'HISTORIA_NO_CERRADA',
        })
      }
    }

    const turnoActivo = await CajaTurno.findOne({
      where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!turnoActivo) {
      await transaction.rollback()
      return res.status(409).json({
        message: 'Debes abrir un turno de caja antes de facturar',
        code: 'TURNO_CAJA_REQUERIDO',
      })
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
      let insumosConsumo = null
      if (item.tipo === 'servicio' && item.servicioClinicoId) {
        const servicioClinico = await ServicioClinico.findOne({
          where: { id: item.servicioClinicoId, clinicaId, activo: true },
          include: [{
            model: ServicioClinicoInsumo,
            as: 'insumos',
          }],
          transaction,
        })

        if (!servicioClinico) {
          await transaction.rollback()
          return res.status(404).json({ message: `Servicio no encontrado: ${item.descripcion}` })
        }

        insumosConsumo = []
        for (const receta of servicioClinico.insumos) {
          const cantidadRequerida = Number(receta.cantidadConsumida) * cantidad

          const insumoClinico = await InsumoClinico.findOne({
            where: { id: receta.insumoClinicoId, clinicaId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          })

          if (!insumoClinico) {
            await transaction.rollback()
            return res.status(404).json({ message: `Insumo clinico no encontrado para el servicio: ${item.descripcion}` })
          }

          if (Number(insumoClinico.stock) < cantidadRequerida) {
            await transaction.rollback()
            return res.status(400).json({ message: `Stock insuficiente de "${insumoClinico.nombre}" para: ${item.descripcion}` })
          }

          insumosConsumo.push({ insumoClinico, cantidadRequerida })
        }
      }

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

        // Piso de precio: un producto no se puede vender por debajo de su costo.
        const precioCompra = convertirANumero(producto.precioCompra, 0)
        if (precioCompra > 0 && precioUnitario < precioCompra) {
          await transaction.rollback()
          return res.status(400).json({
            message: `"${producto.nombre}" no se puede vender por debajo de su costo ($${precioCompra})`,
          })
        }
      }

      // Insumo ya consumido al cerrar la historia clinica. Se cobra, pero NO
      // descuenta stock: el descuento ocurrio en bloquearHistoria. Aqui solo se
      // valida que exista y que no se venda por debajo del costo.
      if (item.tipo === 'insumo') {
        if (!item.insumoClinicoId) {
          await transaction.rollback()
          return res.status(400).json({
            message: `El item "${item.descripcion}" debe indicar el insumo clinico facturado`,
          })
        }

        const insumoFacturado = await InsumoClinico.findOne({
          where: { id: item.insumoClinicoId, clinicaId },
          transaction,
        })

        if (!insumoFacturado) {
          await transaction.rollback()
          return res.status(404).json({ message: `Insumo clinico no encontrado: ${item.descripcion}` })
        }

        const costoBase = convertirANumero(insumoFacturado.precioUnitarioBase, 0)
        if (costoBase > 0 && precioUnitario < costoBase) {
          await transaction.rollback()
          return res.status(400).json({
            message: `"${insumoFacturado.nombre}" no se puede vender por debajo de su costo ($${costoBase})`,
          })
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
        insumosConsumo,
      })
    }

    const descuento = Math.min(convertirANumero(descuentoGeneral, 0), subtotal)
    const baseGravable = subtotal - descuento
    const impuesto = 0
    const total = baseGravable + impuesto

    // Venta a crédito (fiado): nace con todo el total como saldo por cobrar.
    // Exige cliente identificado — no se fía a ventas de mostrador anónimas.
    const esCredito = metodoPago === 'credito'
    if (esCredito && !propietarioId) {
      await transaction.rollback()
      return res.status(400).json({
        message: 'Las ventas a crédito requieren un cliente asociado',
        code: 'CREDITO_REQUIERE_CLIENTE',
      })
    }

    const numero = await generarNumeroFactura(clinicaId, transaction)

    const factura = await Factura.create({
      numero,
      fecha: new Date(),
      estado: 'emitida',
      saldoPendiente: esCredito ? total : 0,
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
      propietarioId: propietarioId || null,
      usuarioId: usuarioId || req.usuario.id,
      clinicaId,
      cajaTurnoId: turnoActivo.id,
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
        servicioClinicoId: item.servicioClinicoId || null,
        insumoClinicoId: item.insumoClinicoId || null,
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

      if (item.tipo === 'servicio' && item.insumosConsumo) {
        for (const { insumoClinico, cantidadRequerida } of item.insumosConsumo) {
          const stockAnterior = Number(insumoClinico.stock)
          const stockNuevo = stockAnterior - cantidadRequerida

          await insumoClinico.update(
            { stock: stockNuevo },
            { transaction }
          )

          await MovimientoInventarioClinico.create({
            tipo: 'salida',
            cantidad: cantidadRequerida,
            stockAnterior,
            stockNuevo,
            motivo: 'uso_servicio',
            observaciones: `Consumo por factura ${numero}`,
            precioUnitario: insumoClinico.precioUnitarioBase,
            insumoClinicoId: insumoClinico.id,
            usuarioId: req.usuario.id,
            clinicaId,
            facturaId: factura.id,
            servicioClinicoId: item.servicioClinicoId,
          }, { transaction })
        }
      }

      // Los items tipo 'insumo' no tocan stock a proposito: ya se descontaron
      // al bloquear la historia clinica que los aplico.
    }

    if (historiaAFacturar) {
      await historiaAFacturar.update({ facturaId: factura.id }, { transaction })
    }

    if (metodoPago === 'efectivo') {
      await turnoActivo.increment('totalVentasEfectivo', { by: total, transaction })
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
    const { fechaInicio, fechaFin, estado, buscar } = req.query
    const { pagina: paginaNumero, limite: limiteNumero, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 })

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

    if (!factura.propietario) {
      return res.status(400).json({
        message: 'La factura no tiene cliente asociado. La facturacion electronica requiere un cliente con datos fiscales.',
      })
    }

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
        message: 'La fecha de vencimiento (fechaVencimientoPago) es obligatoria cuando la forma de pago es credito',
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

const registrarPago = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const { metodoPago, observaciones } = req.body

    const factura = await Factura.findOne({ where: { id, clinicaId } })

    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' })
    }

    if (factura.estado !== 'emitida') {
      return res.status(400).json({
        message: `Solo se pueden marcar como pagadas facturas en estado "emitida". Estado actual: ${factura.estado}`,
      })
    }

    // Ventas a crédito se saldan con abonos (que actualizan saldo y caja),
    // no con un marcado directo que dejaría el cobro sin rastro.
    if (convertirANumero(factura.saldoPendiente) > 0) {
      return res.status(409).json({
        message: 'Esta factura tiene saldo pendiente. Registra el cobro como abono.',
        code: 'USAR_ABONOS',
      })
    }

    const estadoAnterior = factura.estado
    const metodoPagoAnterior = factura.metodoPago

    await factura.update({
      estado: 'pagada',
      ...(metodoPago ? { metodoPago } : {}),
      ...(observaciones ? { observaciones } : {}),
    })

    await registrarAuditoria({
      accion: 'REGISTRAR_PAGO_FACTURA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Factura ${factura.numero} marcada como pagada. Método: ${metodoPago || metodoPagoAnterior || 'no especificado'}`,
      datosAnteriores: { estado: estadoAnterior, metodoPago: metodoPagoAnterior },
      datosNuevos: { estado: 'pagada', metodoPago: metodoPago || metodoPagoAnterior },
      req,
      resultado: 'exitoso',
    })

    const facturaActualizada = await obtenerFacturaDetallada(factura.id, clinicaId)

    res.json({
      message: 'Pago registrado exitosamente',
      factura: facturaActualizada,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Registra un abono (pago parcial o total) a una factura con saldo pendiente.
// Si el abono es en efectivo y el cobrador tiene turno abierto, el monto entra
// a la caja del turno (mismo contador que las ventas de contado de Sergio).
const registrarAbono = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const { id } = req.params
    const { monto, metodoPago, observaciones } = req.body
    const { clinicaId } = req.usuario
    const montoNumero = convertirANumero(monto, NaN)

    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Monto de abono invalido' })
    }

    const factura = await Factura.findOne({
      where: { id, clinicaId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!factura) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Factura no encontrada' })
    }

    if (!['emitida', 'parcial'].includes(factura.estado)) {
      await transaction.rollback()
      return res.status(400).json({
        message: `No se pueden abonar facturas en estado "${factura.estado}"`,
      })
    }

    const saldoActual = convertirANumero(factura.saldoPendiente)

    if (saldoActual <= 0) {
      await transaction.rollback()
      return res.status(409).json({ message: 'La factura no tiene saldo pendiente' })
    }

    if (montoNumero > saldoActual + 0.009) {
      await transaction.rollback()
      return res.status(400).json({
        message: `El abono ($${montoNumero}) supera el saldo pendiente ($${saldoActual})`,
      })
    }

    // Efectivo entra a la caja del cobrador si tiene turno abierto.
    let cajaTurnoId = null
    if (metodoPago === 'efectivo') {
      const turno = await CajaTurno.findOne({
        where: { usuarioId: req.usuario.id, clinicaId, estado: 'abierto' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (turno) {
        await turno.increment('totalVentasEfectivo', { by: montoNumero, transaction })
        cajaTurnoId = turno.id
      }
    }

    const abono = await AbonoFactura.create({
      monto: montoNumero,
      metodoPago: metodoPago || null,
      observaciones: observaciones || null,
      facturaId: factura.id,
      cajaTurnoId,
      usuarioId: req.usuario.id,
      clinicaId,
    }, { transaction })

    const nuevoSaldo = Math.max(0, Math.round((saldoActual - montoNumero) * 100) / 100)
    const nuevoEstado = nuevoSaldo === 0 ? 'pagada' : 'parcial'

    await factura.update({
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
    }, { transaction })

    await transaction.commit()

    await registrarAuditoria({
      accion: 'REGISTRAR_ABONO_FACTURA',
      entidad: 'AbonoFactura',
      entidadId: abono.id,
      descripcion: `Abono de $${montoNumero} a factura ${factura.numero}. Saldo restante: $${nuevoSaldo}`,
      datosNuevos: { facturaId: factura.id, monto: montoNumero, metodoPago, nuevoSaldo, nuevoEstado, cajaTurnoId },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: nuevoSaldo === 0 ? 'Abono registrado. Factura saldada.' : 'Abono registrado',
      abono,
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
    })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Cuentas por cobrar: facturas con saldo, agrupadas por cliente y ordenadas
// por deuda total (la vista "quién me debe y cuánto" estilo Treinta).
const listarCuentasPorCobrar = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const facturas = await Factura.findAll({
      where: {
        clinicaId,
        estado: { [Op.in]: ['emitida', 'parcial'] },
        saldoPendiente: { [Op.gt]: 0 },
      },
      attributes: ['id', 'numero', 'fecha', 'total', 'saldoPendiente', 'estado', 'propietarioId'],
      include: [{
        model: Propietario,
        as: 'propietario',
        attributes: ['id', 'nombre', 'telefono', 'email'],
      }],
      order: [['fecha', 'ASC']],
    })

    const porCliente = new Map()
    let totalPorCobrar = 0

    for (const f of facturas) {
      const saldo = convertirANumero(f.saldoPendiente)
      totalPorCobrar += saldo

      const key = f.propietarioId || 'sin-cliente'
      const entrada = porCliente.get(key) || {
        propietarioId: f.propietarioId,
        nombre: f.propietario?.nombre || 'Venta de mostrador',
        telefono: f.propietario?.telefono || null,
        email: f.propietario?.email || null,
        totalDeuda: 0,
        facturaMasAntigua: f.fecha,
        facturas: [],
      }

      entrada.totalDeuda = Math.round((entrada.totalDeuda + saldo) * 100) / 100
      entrada.facturas.push({
        id: f.id,
        numero: f.numero,
        fecha: f.fecha,
        total: f.total,
        saldoPendiente: f.saldoPendiente,
        estado: f.estado,
      })
      porCliente.set(key, entrada)
    }

    const clientes = Array.from(porCliente.values())
      .sort((a, b) => b.totalDeuda - a.totalDeuda)

    res.json({
      totalPorCobrar: Math.round(totalPorCobrar * 100) / 100,
      totalClientes: clientes.length,
      totalFacturas: facturas.length,
      clientes,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
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

    // Una factura con abonos ya recibió dinero del cliente: anularla dejaría
    // ese dinero sin rastro contable. Debe resolverse la devolución primero.
    const abonosExistentes = await AbonoFactura.count({
      where: { facturaId: factura.id, clinicaId },
      transaction,
    })

    if (abonosExistentes > 0) {
      await transaction.rollback()
      return res.status(409).json({
        message:
          'La factura tiene abonos registrados. Gestiona la devolución al cliente antes de anularla.',
        code: 'FACTURA_CON_ABONOS',
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

    // Solo 'uso_servicio' se revierte. Los consumos con motivo 'uso_procedimiento'
    // se descontaron al cerrar la historia clinica, no aqui: el medicamento ya
    // entro al paciente y anular la factura devuelve el dinero, no el insumo.
    // Reponer ese stock exige corregir la historia o un ajuste manual.
    const movimientosClinicosFactura = await MovimientoInventarioClinico.findAll({
      where: { facturaId: factura.id, clinicaId, motivo: 'uso_servicio' },
      transaction,
    })

    for (const movimientoOriginal of movimientosClinicosFactura) {
      const insumoClinico = await InsumoClinico.findOne({
        where: { id: movimientoOriginal.insumoClinicoId, clinicaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (insumoClinico) {
        const cantidad = Number(movimientoOriginal.cantidad)
        const stockAnterior = Number(insumoClinico.stock)
        const stockNuevo = stockAnterior + cantidad

        await insumoClinico.update(
          { stock: stockNuevo },
          { transaction }
        )

        await MovimientoInventarioClinico.create({
          tipo: 'entrada',
          cantidad,
          stockAnterior,
          stockNuevo,
          motivo: 'devolucion',
          observaciones: `Reingreso por anulacion de factura ${factura.numero}`,
          precioUnitario: movimientoOriginal.precioUnitario,
          insumoClinicoId: insumoClinico.id,
          usuarioId: req.usuario.id,
          clinicaId,
          facturaId: factura.id,
          servicioClinicoId: movimientoOriginal.servicioClinicoId,
        }, { transaction })
      }
    }

    // Revertir el efecto en la caja: si la venta fue en efectivo y el turno
    // sigue abierto, descontar el total de totalVentasEfectivo para que el
    // cajero no cargue con un descuadre falso al cierre. Si el turno ya
    // cerró, no se toca (el arqueo histórico es inmutable); queda constancia
    // en la auditoría de la anulación.
    let cajaAjustada = false
    if (factura.cajaTurnoId && factura.metodoPago === 'efectivo') {
      const turnoVenta = await CajaTurno.findOne({
        where: { id: factura.cajaTurnoId, clinicaId, estado: 'abierto' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (turnoVenta) {
        await turnoVenta.decrement('totalVentasEfectivo', {
          by: convertirANumero(factura.total),
          transaction,
        })
        cajaAjustada = true
      }
    }

    // Soltar la consulta para que pueda volver a cobrarse. El stock consumido
    // no se repone: el insumo ya se aplico al paciente.
    await HistoriaClinica.update(
      { facturaId: null },
      { where: { facturaId: factura.id, clinicaId }, transaction }
    )

    await factura.update({ estado: 'anulada', motivoAnulacion }, { transaction })
    await transaction.commit()

    await registrarAuditoria({
      accion: 'ANULAR_FACTURA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Factura ${factura.numero} anulada. Motivo: ${motivoAnulacion}`,
      datosAnteriores: { estado: 'emitida' },
      datosNuevos: { estado: 'anulada', motivoAnulacion, cajaAjustada },
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Factura anulada exitosamente' })
  } catch (error) {
    await transaction.rollback()
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const descargarFacturaElectronica = async (req, res) => {
  try {
    const { id, formato } = req.params
    const { clinicaId } = req.usuario

    const formatoNormalizado = String(formato || '').toLowerCase()
    if (!['pdf', 'xml'].includes(formatoNormalizado)) {
      return res.status(400).json({ message: 'Formato no valido. Use pdf o xml.' })
    }

    const factura = await Factura.findOne({ where: { id, clinicaId } })

    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' })
    }

    if (factura.estadoElectronico !== 'validada') {
      return res.status(409).json({
        message: 'La factura no ha sido validada electronicamente en Factus',
      })
    }

    const numeroFactus = factura.respuestaElectronica?.data?.bill?.number || factura.referenciaExterna

    if (!numeroFactus) {
      return res.status(409).json({
        message: 'No se encontro el numero de factura electronica para descargar',
      })
    }

    const { configuracionEfectiva } = await obtenerContextoFactusPorClinica(clinicaId)

    if (!configuracionEfectiva.credencialesCompletas) {
      return res.status(400).json({
        message: 'Faltan credenciales de Factus para descargar la factura',
      })
    }

    const tokenFactus = await solicitarTokenFactus({
      baseUrl: configuracionEfectiva.baseUrl,
      clientId: configuracionEfectiva.clientId,
      clientSecret: configuracionEfectiva.clientSecret,
      username: configuracionEfectiva.username,
      password: configuracionEfectiva.password,
    })

    const descargar = formatoNormalizado === 'pdf' ? descargarPdfFactura : descargarXmlFactura
    const respuesta = await descargar({
      baseUrl: configuracionEfectiva.baseUrl,
      token: tokenFactus.access_token,
      numero: numeroFactus,
    })

    const data = respuesta?.data || {}
    const base64 =
      formatoNormalizado === 'pdf' ? data.pdf_base_64_encoded : data.xml_base_64_encoded

    if (!base64) {
      return res.status(502).json({ message: 'Factus no devolvio el archivo solicitado' })
    }

    const buffer = Buffer.from(base64, 'base64')
    const baseName = limpiarTexto(data.file_name) || `factura-${factura.numero}`
    const nombreArchivo = baseName.toLowerCase().endsWith(`.${formatoNormalizado}`)
      ? baseName
      : `${baseName}.${formatoNormalizado}`
    const contentType = formatoNormalizado === 'pdf' ? 'application/pdf' : 'application/xml'

    await registrarAuditoria({
      accion: 'DESCARGAR_FACTURA_ELECTRONICA',
      entidad: 'Factura',
      entidadId: factura.id,
      descripcion: `Descarga ${formatoNormalizado.toUpperCase()} de factura ${factura.numero} desde Factus`,
      req,
      resultado: 'exitoso',
    })

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.setHeader('Content-Length', buffer.length)
    return res.send(buffer)
  } catch (error) {
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500
    return res.status(status).json({
      message: 'No fue posible descargar la factura electronica',
      error: error.message,
      payload: error.payload || null,
    })
  }
}

module.exports = {
  crearFactura,
  obtenerFacturas,
  obtenerFactura,
  emitirFacturaElectronica,
  descargarFacturaElectronica,
  anularFactura,
  registrarPago,
  registrarAbono,
  listarCuentasPorCobrar,
}
