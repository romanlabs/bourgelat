const logger = require('../utils/logger')
const { enviarEmailAlertaErrores } = require('./emailService')

// Avisa al equipo por correo cuando algo falla en producción, para no enterarnos
// por la clínica. Los errores se agrupan y hay tope: el plan gratuito de Brevo
// (300 correos al día) lo comparten los códigos de verificación y los recordatorios.
const ESPERA_PARA_AGRUPAR_MS = 2 * 60 * 1000
const MINIMO_ENTRE_CORREOS_MS = 15 * 60 * 1000
const TOPE_CORREOS_POR_DIA = 10
const MAXIMO_GRUPOS = 20
const DIA_MS = 24 * 60 * 60 * 1000
const ESPERA_ANTES_DE_SALIR_MS = 5000

// El mensaje de un error puede traer datos de quien usó la app.
const limpiarTexto = (texto, largo = 200) =>
  String(texto ?? '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, '[correo]')
    .replace(/\d{6,}/g, '[número]')
    .slice(0, largo)

const crearAlertas = ({ enviar, ahora = Date.now, programar = setTimeout }) => {
  const grupos = new Map()
  let temporizador = null
  let ultimoEnvio = 0
  let dia = null
  let enviadosHoy = 0

  const enviarPendientes = async () => {
    temporizador = null
    if (grupos.size === 0) return

    const filas = [...grupos.values()]
    grupos.clear()

    const diaActual = Math.floor(ahora() / DIA_MS)
    if (diaActual !== dia) {
      dia = diaActual
      enviadosHoy = 0
    }
    if (enviadosHoy >= TOPE_CORREOS_POR_DIA) {
      logger.warn({ contexto: 'alertas', mensaje: 'Tope diario de correos de alerta alcanzado', grupos: filas.length })
      return
    }

    enviadosHoy += 1
    ultimoEnvio = ahora()
    try {
      await enviar(filas)
    } catch (error) {
      logger.warn({ contexto: 'alertas', mensaje: 'No se pudo enviar el correo de alerta', error: error.message })
    }
  }

  const registrar = ({ origen = 'servidor', metodo = '', ruta = '', mensaje = '', clinicaId = null }) => {
    const datos = { origen, metodo, ruta: limpiarTexto(ruta), mensaje: limpiarTexto(mensaje) }
    let clave = [datos.origen, datos.metodo, datos.ruta, datos.mensaje].join('|')
    if (!grupos.has(clave) && grupos.size >= MAXIMO_GRUPOS) {
      clave = 'otros'
      if (!grupos.has(clave)) {
        grupos.set(clave, { origen, metodo: '', ruta: '(otros)', mensaje: 'Más errores distintos', veces: 0, clinicas: new Set() })
      }
    }
    const grupo = grupos.get(clave) || { ...datos, veces: 0, clinicas: new Set() }
    grupo.veces += 1
    if (clinicaId) grupo.clinicas.add(clinicaId)
    grupos.set(clave, grupo)

    if (temporizador) return
    const espera = Math.max(ESPERA_PARA_AGRUPAR_MS, ultimoEnvio + MINIMO_ENTRE_CORREOS_MS - ahora())
    temporizador = programar(enviarPendientes, espera)
    temporizador?.unref?.()
  }

  return { registrar, enviarPendientes }
}

const alertas = crearAlertas({
  enviar: (filas) =>
    process.env.NODE_ENV === 'production'
      ? enviarEmailAlertaErrores({ filas })
      : Promise.resolve(),
})

// Nunca debe romper la respuesta que ya estaba fallando.
const registrarErrorInterno = (datos) => {
  try {
    logger.error({
      contexto: 'error-interno',
      origen: datos.origen || 'servidor',
      metodo: datos.metodo,
      ruta: limpiarTexto(datos.ruta),
      mensaje: limpiarTexto(datos.mensaje, 500),
      clinicaId: datos.clinicaId || null,
    })
    alertas.registrar(datos)
  } catch {
    // Sin alerta, pero la respuesta sigue.
  }
}

// El proceso va a morir: se intenta avisar sin esperar a agrupar.
const avisarCaidaDelProceso = async (error) => {
  registrarErrorInterno({ ruta: 'proceso', mensaje: `El servidor se cayó: ${error?.message || error}` })
  await Promise.race([
    alertas.enviarPendientes(),
    new Promise((resolve) => setTimeout(resolve, ESPERA_ANTES_DE_SALIR_MS)),
  ])
}

module.exports = {
  crearAlertas,
  limpiarTexto,
  registrarErrorInterno,
  avisarCaidaDelProceso,
  TOPE_CORREOS_POR_DIA,
}
