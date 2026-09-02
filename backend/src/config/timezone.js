'use strict'

// Zona horaria del proceso. Debe cargarse ANTES que cualquier otro modulo.
//
// El horario de atencion y los bloqueos de agenda comparan cadenas
// 'YYYY-MM-DD' y 'HH:MM', asi que no dependen de esto. El cierre diario de
// caja si: para saber que dia es "hoy" y que hora es "ahora" hay que
// resolverlos en la zona de la clinica, no en la del host.
//
// docker-compose y render.yaml ya definen TZ. Esto cubre el arranque local y
// cualquier entorno nuevo donde falte: sin una zona definida, un contenedor
// corre en UTC y el dia se corta cinco horas antes de tiempo.
//
// Se respeta TZ si viene del entorno, para que un despliegue en otra zona no
// tenga que tocar codigo. El valor por defecto solo aplica si no hay ninguno.

require('dotenv').config()

const ZONA_HORARIA_POR_DEFECTO = 'America/Bogota'

if (!process.env.TZ) {
  process.env.TZ = ZONA_HORARIA_POR_DEFECTO
}

module.exports = {
  ZONA_HORARIA_POR_DEFECTO,
  zonaHoraria: process.env.TZ,
}
