// Crea (o recrea) la clínica de demostración LOCAL que se usa para tomar
// capturas del programa: "Clínica Veterinaria Los Andes", con agenda de hoy,
// pacientes, historias, inventario y un turno de caja abierto. Todos los datos
// son inventados (ver clinicaDemoDatos.js).
//
// Uso:
//   npm run demo:clinica
//
// El admin es demo@bourgelat.test. Su contraseña se genera al azar en cada
// ejecución y se guarda SOLO en backend/.demo-credenciales (ignorado por git);
// nunca se imprime. Si la clínica ya existe, se borran únicamente las filas con
// su clinicaId y se vuelve a crear. Se niega a correr en producción.

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const bcrypt = require('bcryptjs')
const sequelize = require('../config/database')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const Suscripcion = require('../models/Suscripcion')
const Consultorio = require('../models/Consultorio')
const Propietario = require('../models/Propietario')
const Mascota = require('../models/Mascota')
const Cita = require('../models/Cita')
const HistoriaClinica = require('../models/HistoriaClinica')
const Producto = require('../models/Producto')
const MovimientoInventario = require('../models/MovimientoInventario')
const CajaTurno = require('../models/CajaTurno')
const MovimientoCaja = require('../models/MovimientoCaja')
const Factura = require('../models/Factura')
const FacturaItem = require('../models/FacturaItem')
const { crearSuscripcionCortesia } = require('../config/planes')
const { formatDateOnlyLocal } = require('../utils/dateOnly')
const { construirDatosDemo, EMAIL_ADMIN } = require('./clinicaDemoDatos')

const ARCHIVO_CREDENCIALES = path.join(__dirname, '..', '..', '.demo-credenciales')
const ZONA = '-05:00' // Colombia

const consultar = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, transaction, type: sequelize.QueryTypes.SELECT })

const ejecutar = (sql, replacements, transaction) =>
  sequelize.query(sql, { replacements, transaction })

const instante = (fecha, hora) => new Date(`${fecha}T${hora}:00${ZONA}`)

// Hora de la plantilla, sin pasar del momento actual (nada "del futuro").
const hastaAhora = (fecha, hora, orden) => {
  const deseado = instante(fecha, hora)
  const tope = new Date(Date.now() - (orden + 1) * 60 * 1000)
  return deseado < tope ? deseado : tope
}

// Borra solo lo que pertenece a la clínica indicada. Las tablas con FK entre sí
// se intentan en pasadas con SAVEPOINT hasta que no quede ninguna.
const borrarClinica = async (clinicaId, transaction) => {
  const usuarios = await consultar('SELECT id FROM usuarios WHERE "clinicaId" = :clinicaId', { clinicaId }, transaction)
  const usuarioIds = usuarios.map((u) => u.id)

  await ejecutar(
    'DELETE FROM factura_items WHERE "facturaId" IN (SELECT id FROM facturas WHERE "clinicaId" = :clinicaId)',
    { clinicaId },
    transaction
  )
  if (usuarioIds.length > 0) {
    for (const tabla of ['codigos_verificacion_email', 'email_verification_tokens', 'password_reset_tokens']) {
      await ejecutar(`DELETE FROM "${tabla}" WHERE "usuarioId" IN (:usuarioIds)`, { usuarioIds }, transaction)
    }
  }

  const filas = await consultar(
    `SELECT table_name FROM information_schema.columns
     WHERE column_name = 'clinicaId' AND table_schema = 'public' ORDER BY table_name`,
    {},
    transaction
  )
  let pendientes = filas.map((fila) => fila.table_name)

  while (pendientes.length > 0) {
    const siguientes = []
    for (const tabla of pendientes) {
      await ejecutar('SAVEPOINT borrar_demo', {}, transaction)
      try {
        await ejecutar(`DELETE FROM "${tabla}" WHERE "clinicaId" = :clinicaId`, { clinicaId }, transaction)
        await ejecutar('RELEASE SAVEPOINT borrar_demo', {}, transaction)
      } catch (error) {
        await ejecutar('ROLLBACK TO SAVEPOINT borrar_demo', {}, transaction)
        siguientes.push(tabla)
      }
    }
    if (siguientes.length === pendientes.length) {
      throw new Error(`No se pudo borrar la clínica demo; tablas pendientes: ${siguientes.join(', ')}`)
    }
    pendientes = siguientes
  }

  await ejecutar('DELETE FROM clinicas WHERE id = :clinicaId', { clinicaId }, transaction)
}

const generarContrasena = () => `${crypto.randomBytes(12).toString('base64url')}aA1!`

const escribirCredenciales = (email, password) => {
  const contenido = [
    '# Cuenta de la clínica de demostración local (npm run demo:clinica).',
    '# Se regenera en cada ejecución. No se sube a git.',
    `email=${email}`,
    `password=${password}`,
    '',
  ].join('\n')
  fs.writeFileSync(ARCHIVO_CREDENCIALES, contenido, { encoding: 'utf8', mode: 0o600 })
}

const crear = async (datos, passwordHash, transaction) => {
  const hoy = datos.turnoCaja.fecha
  const ahora = new Date()
  const diasAtras = (dias) => new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

  const clinica = await Clinica.create(
    {
      nombre: datos.clinica.nombre,
      nombreComercial: datos.clinica.nombreComercial,
      email: datos.clinica.email,
      // Clinica exige password en el modelo; el acceso real es por Usuario.
      password: passwordHash,
      telefono: datos.clinica.telefono,
      direccion: datos.clinica.direccion,
      ciudad: datos.clinica.ciudad,
      departamento: datos.clinica.departamento,
      tipoPersona: datos.clinica.tipoPersona,
      horarioAtencion: datos.clinica.horarioAtencion,
      ultimoAcceso: ahora,
    },
    { transaction }
  )
  const clinicaId = clinica.id

  await Suscripcion.create(crearSuscripcionCortesia(clinicaId), { transaction })

  const usuarios = {}
  for (const u of datos.usuarios) {
    usuarios[u.key] = await Usuario.create(
      {
        nombre: u.nombre,
        email: u.email,
        password: passwordHash,
        rol: u.rol,
        rolesAdicionales: u.rolesAdicionales,
        cargo: u.cargo,
        tarjetaProfesional: u.tarjetaProfesional,
        telefono: u.telefono,
        activo: true,
        emailVerificado: true,
        requiereVerificacionCodigo: false,
        ultimoAcceso: ahora,
        clinicaId,
        onboarding: {
          usoPlanificado: 'Agenda, historias clínicas y caja',
          cargo: u.cargo,
          whatsapp: u.telefono,
          tipoClinica: 'Clínica de pequeños animales',
          tamanoEquipo: '2-5',
          mascotasPorMes: '100-300',
          objetivoInicial: 'Tener la agenda y las historias en un solo lugar',
          gestionActual: 'Cuaderno y hojas de cálculo',
          completadoEn: ahora.toISOString(),
        },
      },
      { transaction }
    )
  }

  const consultorios = {}
  for (const c of datos.consultorios) {
    consultorios[c.key] = await Consultorio.create(
      { nombre: c.nombre, descripcion: c.descripcion, clinicaId },
      { transaction }
    )
  }

  const propietarios = {}
  for (const p of datos.propietarios) {
    propietarios[p.key] = await Propietario.create(
      {
        nombre: p.nombre,
        tipoDocumento: p.tipoDocumento,
        numeroDocumento: p.numeroDocumento,
        telefono: p.telefono,
        email: p.email,
        direccion: p.direccion,
        barrio: p.barrio,
        ciudad: p.ciudad,
        clinicaId,
      },
      { transaction }
    )
  }

  const mascotas = {}
  let numeroHistoria = 0
  for (const m of datos.mascotas) {
    numeroHistoria += 1
    mascotas[m.key] = await Mascota.create(
      {
        nombre: m.nombre,
        especie: m.especie,
        raza: m.raza,
        sexo: m.sexo,
        fechaNacimiento: m.fechaNacimiento,
        peso: m.peso,
        color: m.color,
        esterilizado: m.esterilizado,
        numeroHistoria,
        propietarioId: propietarios[m.propietarioKey].id,
        clinicaId,
      },
      { transaction }
    )
  }

  const citas = {}
  for (const c of [...datos.citas, ...datos.citasPasadas]) {
    const mascotaDemo = datos.mascotas.find((m) => m.key === c.mascotaKey)
    citas[c.key] = await Cita.create(
      {
        fecha: c.fecha,
        horaInicio: c.horaInicio,
        horaFin: c.horaFin,
        motivo: c.motivo,
        tipoCita: c.tipoCita,
        estado: c.estado,
        origen: c.origen,
        horaLlegada: c.horaLlegada || null,
        horaInicioAtencion: c.horaInicioAtencion || null,
        motivoCancelacion: c.motivoCancelacion || null,
        mascotaId: mascotas[c.mascotaKey].id,
        propietarioId: propietarios[mascotaDemo.propietarioKey].id,
        veterinarioId: usuarios[c.veterinarioKey].id,
        consultorioId: consultorios[c.consultorioKey].id,
        clinicaId,
      },
      { transaction }
    )
  }

  for (const h of datos.historias) {
    const mascotaDemo = datos.mascotas.find((m) => m.key === h.mascotaKey)
    const fechaConsulta = h.fecha === hoy ? hastaAhora(h.fecha, h.hora, 0) : instante(h.fecha, h.hora)
    await HistoriaClinica.create(
      {
        fechaConsulta,
        createdAt: fechaConsulta,
        motivoConsulta: h.motivoConsulta,
        anamnesis: h.anamnesis,
        peso: h.peso,
        temperatura: h.temperatura,
        frecuenciaCardiaca: h.frecuenciaCardiaca,
        frecuenciaRespiratoria: h.frecuenciaRespiratoria,
        condicionCorporal: h.condicionCorporal,
        mucosas: h.mucosas,
        estadoHidratacion: h.estadoHidratacion,
        examenFisicoDetalle: h.examenFisicoDetalle,
        diagnostico: h.diagnostico,
        diagnosticoPresuntivo: h.diagnosticoPresuntivo || null,
        tratamiento: h.tratamiento,
        medicamentos: h.medicamentos,
        tratamientoIntrahospitalario: [],
        indicaciones: h.indicaciones,
        proximaConsulta: h.proximaConsulta,
        bloqueada: h.bloqueada,
        bloqueadaEn: h.bloqueada ? fechaConsulta : null,
        citaId: h.citaKey ? citas[h.citaKey].id : null,
        mascotaId: mascotas[h.mascotaKey].id,
        propietarioId: propietarios[mascotaDemo.propietarioKey].id,
        veterinarioId: usuarios[h.veterinarioKey].id,
        clinicaId,
      },
      { transaction }
    )
  }

  // Inventario: existencias iniciales de hace un mes y las salidas por ventas de hoy.
  const productos = {}
  const stockActual = {}
  for (const p of datos.productos) {
    productos[p.key] = await Producto.create(
      {
        nombre: p.nombre,
        categoria: p.categoria,
        unidadMedida: p.unidadMedida,
        precioCompra: p.precioCompra,
        precioVenta: p.precioVenta,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        fechaVencimiento: p.fechaVencimiento,
        lote: p.lote,
        laboratorio: p.laboratorio,
        requiereFormula: Boolean(p.requiereFormula),
        clinicaId,
      },
      { transaction }
    )
    stockActual[p.key] = p.stockInicial
    await MovimientoInventario.create(
      {
        tipo: 'entrada',
        cantidad: p.stockInicial,
        stockAnterior: 0,
        stockNuevo: p.stockInicial,
        motivo: 'inventario_inicial',
        precioUnitario: p.precioCompra,
        productoId: productos[p.key].id,
        usuarioId: usuarios.admin.id,
        clinicaId,
        createdAt: diasAtras(30),
      },
      { transaction }
    )
  }

  // Caja: un turno abierto hoy, con ventas en varios medios de pago.
  const t = datos.turnoCaja
  const ingresosManuales = datos.movimientosCaja.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresosManuales = datos.movimientosCaja.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const turno = await CajaTurno.create(
    {
      estado: 'abierto',
      montoInicial: t.montoInicial,
      totalVentasEfectivo: t.totalVentasEfectivo,
      totalIngresosManuales: ingresosManuales,
      totalEgresosManuales: egresosManuales,
      fechaApertura: hastaAhora(t.fecha, t.horaApertura, 20),
      usuarioId: usuarios[t.usuarioKey].id,
      clinicaId,
    },
    { transaction }
  )

  let orden = 0
  for (const v of datos.ventas) {
    orden += 1
    const momento = hastaAhora(v.fecha, v.hora, 20 - orden)
    const propietarioId = propietarios[v.propietarioKey].id
    const factura = await Factura.create(
      {
        numero: v.numero,
        fecha: v.fecha,
        estado: 'pagada',
        saldoPendiente: 0,
        subtotal: v.total,
        descuento: 0,
        impuesto: 0,
        total: v.total,
        metodoPago: v.metodoPago,
        propietarioId,
        usuarioId: usuarios[v.usuarioKey].id,
        clinicaId,
        cajaTurnoId: turno.id,
        createdAt: momento,
      },
      { transaction }
    )

    for (const item of v.items) {
      await FacturaItem.create(
        {
          descripcion: item.descripcion,
          tipo: item.tipo,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          descuento: 0,
          subtotal: item.subtotal,
          productoId: item.productoKey ? productos[item.productoKey].id : null,
          facturaId: factura.id,
          createdAt: momento,
        },
        { transaction }
      )

      if (item.productoKey) {
        const anterior = stockActual[item.productoKey]
        const nuevo = anterior - item.cantidad
        stockActual[item.productoKey] = nuevo
        await MovimientoInventario.create(
          {
            tipo: 'salida',
            cantidad: item.cantidad,
            stockAnterior: anterior,
            stockNuevo: nuevo,
            motivo: 'venta',
            observaciones: `Salida por factura ${v.numero}`,
            precioUnitario: item.precioUnitario,
            productoId: productos[item.productoKey].id,
            usuarioId: usuarios[v.usuarioKey].id,
            clinicaId,
            createdAt: momento,
          },
          { transaction }
        )
      }
    }
  }

  orden = 0
  for (const m of datos.movimientosCaja) {
    orden += 1
    await MovimientoCaja.create(
      {
        tipo: m.tipo,
        monto: m.monto,
        motivo: m.motivo,
        observaciones: m.observaciones,
        cajaTurnoId: turno.id,
        usuarioId: usuarios[t.usuarioKey].id,
        clinicaId,
        createdAt: hastaAhora(t.fecha, m.hora, 10 - orden),
      },
      { transaction }
    )
  }

  return clinica
}

const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('demo:clinica no corre con NODE_ENV=production')
  }

  const datos = construirDatosDemo(formatDateOnlyLocal())

  // El correo del admin es único en todo el sistema: si es de otra clínica, no se toca.
  const [existenteAdmin] = await consultar(
    'SELECT u.id, c.email AS "clinicaEmail" FROM usuarios u LEFT JOIN clinicas c ON c.id = u."clinicaId" WHERE lower(u.email) = :email',
    { email: EMAIL_ADMIN }
  )
  if (existenteAdmin && existenteAdmin.clinicaEmail !== datos.clinica.email) {
    throw new Error(`${EMAIL_ADMIN} ya pertenece a otra clínica; no se modifica nada`)
  }

  const password = generarContrasena()
  const passwordHash = await bcrypt.hash(password, 12)

  const clinica = await sequelize.transaction(async (transaction) => {
    const previa = await Clinica.findOne({ where: { email: datos.clinica.email }, transaction, sinTenant: true })
    if (previa) {
      await borrarClinica(previa.id, transaction)
      console.log('Clínica demo anterior eliminada (solo sus filas).')
    }
    return crear(datos, passwordHash, transaction)
  })

  escribirCredenciales(EMAIL_ADMIN, password)

  console.log(`Clínica demo lista: ${clinica.nombre} (${clinica.id})`)
  console.log(`Usuarios ${datos.usuarios.length}, propietarios ${datos.propietarios.length}, mascotas ${datos.mascotas.length}, citas de hoy ${datos.citas.length}, historias ${datos.historias.length}, productos ${datos.productos.length}, ventas ${datos.ventas.length}.`)
  console.log(`Credenciales en ${ARCHIVO_CREDENCIALES}`)
}

if (require.main === module) {
  main()
    .then(() => sequelize.close())
    .catch(async (error) => {
      console.error(`Error: ${error.message}`)
      await sequelize.close()
      process.exit(1)
    })
}
