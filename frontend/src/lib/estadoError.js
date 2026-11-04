// Decide qué le contamos a la clínica cuando una pantalla falla. Lo técnico nunca
// se muestra: se reporta aparte (lib/reportarError.js).

const CLAVE_REINTENTO = 'bourgelat-reintento-carga'
// Tras este tiempo se vale reintentar otra vez: cada publicación nueva vuelve a
// dejar módulos viejos en las pestañas abiertas.
const ESPERA_ENTRE_REINTENTOS_MS = 60_000

export const esErrorDeCarga = (error) =>
  /dynamically imported module|importing a module script failed|chunkloaderror/i.test(
    String(error?.message || error?.statusText || error || ''),
  )

// 'conexion' sin internet, 'actualizacion' si falta un módulo de una versión
// anterior, 'revision' para lo demás.
export const clasificarError = (error, enLinea = true) => {
  if (!enLinea) return 'conexion'
  return esErrorDeCarga(error) ? 'actualizacion' : 'revision'
}

// Por qué no llegó la información de una sección. Un 4xx trae un motivo escrito
// para la clínica (sin permiso, plan...); lo demás no se traduce a jerga: las
// consultas se repiten solas, así que «seguimos intentando» es literal.
export const textoAvisoError = (error) => {
  const estado = error?.response?.status
  if (estado >= 400 && estado < 500 && error.response.data?.message) {
    return { motivo: error.response.data.message, reintenta: false }
  }
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || error?.request)) {
    return { motivo: 'La conexión está inestable. Seguimos intentando traerla.', reintenta: true }
  }
  return { motivo: 'Seguimos intentando traerla. También puedes probar ahora mismo.', reintenta: true }
}

// Recargar solo no debe entrar en bucle, pero tampoco gastarse para siempre: antes
// la marca duraba toda la sesión y a la segunda publicación la pestaña se quedaba
// en el error.
export const debeReintentarCarga = (ruta, ahora = Date.now(), almacen = window.sessionStorage) => {
  const clave = `${CLAVE_REINTENTO}:${ruta}`
  try {
    const ultimo = Number(almacen.getItem(clave)) || 0
    if (ahora - ultimo < ESPERA_ENTRE_REINTENTOS_MS) return false
    almacen.setItem(clave, String(ahora))
    return true
  } catch {
    // Sin almacenamiento no hay cómo evitar el bucle: mejor dejar el botón.
    return false
  }
}
