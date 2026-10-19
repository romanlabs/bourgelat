// Utilidades de fecha y mediciones para la ficha del paciente.
import { fechaLocal } from '@/lib/fecha'

// Las fechas llegan como 'AAAA-MM-DD' (o ISO completo): se leen como fecha
// local para que no se corran un día por la zona horaria.
export const aFechaLocal = (valor) => {
  const [y, m, d] = String(valor).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
// Fechas con hora (fechaConsulta) se pasan al día local; las de solo día quedan igual.
export const soloDia = (valor) => {
  const texto = String(valor || '')
  return texto.length > 10 ? fechaLocal(new Date(texto)) : texto
}

export const fechaCorta = (valor) =>
  aFechaLocal(valor).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
export const mesCorto = (valor) =>
  aFechaLocal(valor).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
// Para las barras: «feb.», y con el año solo si no es el actual («ago. 25»).
export const mesBarra = (valor) => {
  const fecha = aFechaLocal(valor)
  const mes = fecha.toLocaleDateString('es-CO', { month: 'short' })
  return fecha.getFullYear() === new Date().getFullYear() ? mes : `${mes} ${String(fecha.getFullYear()).slice(2)}`
}

export const formatoNumero = (valor, decimales = 1) =>
  Number(valor).toLocaleString('es-CO', { maximumFractionDigits: decimales })

// Mediciones de las consultas, de la más antigua a la más reciente.
export function medicionesDe(historias, campo) {
  return historias
    .filter((h) => h[campo] !== null && h[campo] !== undefined && h[campo] !== '' && Number(h[campo]) > 0)
    .map((h) => ({ fecha: soloDia(h.fechaConsulta || h.createdAt), valor: Number(h[campo]) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}
