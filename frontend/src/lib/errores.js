// Mensaje de error para mostrar a la clínica. Nunca muestra el texto técnico de
// axios («Network Error», «timeout of 15000ms exceeded», «Request failed with
// status code 502») ni el campo `error` crudo del backend.
//
// Sin respuesta del servidor no se sabe si la operación quedó guardada: el
// mensaje pide verificar antes de reintentar para no duplicar ventas o cobros.
export const mensajeDeError = (error, fallback) => {
  if (error?.response) {
    return error.response.data?.message || fallback
  }
  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK' || error?.request) {
    return 'Sin conexión o el servidor tardó en responder. Revisa si quedó registrado antes de intentarlo de nuevo.'
  }
  return fallback
}
