// Fechas de calendario en la hora local del usuario.
//
// No usar `new Date().toISOString().slice(0, 10)`: convierte a UTC y en
// Colombia (UTC-5), desde las 7 p. m., ya es el dia siguiente en UTC; los
// formularios abrian con la fecha de manana. Estas funciones arman el texto con
// las partes locales, en el mismo formato 'YYYY-MM-DD' que usa la API.

const dos = (n) => String(n).padStart(2, '0')

/** Fecha local como 'YYYY-MM-DD'. */
export const fechaLocal = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`

/** Mes local como 'YYYY-MM'. */
export const mesLocal = (fecha = new Date()) => fechaLocal(fecha).slice(0, 7)

/** Hoy en la hora local, 'YYYY-MM-DD'. */
export const hoyLocal = () => fechaLocal()
