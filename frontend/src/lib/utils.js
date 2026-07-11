import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Edad legible a partir de una fecha de nacimiento (YYYY-MM-DD).
// Devuelve '' si la fecha es inválida o futura.
export function formatearEdad(fechaNacimiento) {
  if (!fechaNacimiento) return ''
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  if (Number.isNaN(nacimiento.getTime())) return ''

  const hoy = new Date()
  let anios = hoy.getFullYear() - nacimiento.getFullYear()
  let meses = hoy.getMonth() - nacimiento.getMonth()
  if (hoy.getDate() < nacimiento.getDate()) meses -= 1
  if (meses < 0) {
    anios -= 1
    meses += 12
  }
  if (anios < 0) return ''

  if (anios === 0 && meses === 0) {
    const dias = Math.max(Math.floor((hoy - nacimiento) / 86400000), 0)
    return `${dias} ${dias === 1 ? 'día' : 'días'}`
  }
  if (anios === 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const textoAnios = `${anios} ${anios === 1 ? 'año' : 'años'}`
  return meses > 0 ? `${textoAnios} ${meses} ${meses === 1 ? 'mes' : 'meses'}` : textoAnios
}
