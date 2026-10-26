import { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input/max'

// Los celulares de contacto se guardan en E.164 (+573001234567). Los viejos
// quedaron sin indicativo (10 dígitos colombianos): se leen como de Colombia.
const leer = (valor) => {
  if (!valor) return undefined
  try {
    return parsePhoneNumber(String(valor), 'CO')
  } catch {
    return undefined
  }
}

export const celularE164 = (valor) => leer(valor)?.number || ''

export const esCelularValido = (valor) => Boolean(valor) && isValidPhoneNumber(String(valor), 'CO')

// Para mostrar: los de Colombia sin indicativo, los demás con el suyo.
export const formatearCelular = (valor) => {
  const numero = leer(valor)
  if (!numero?.isValid()) return valor || ''
  return numero.country === 'CO' ? numero.formatNational() : numero.formatInternational()
}
