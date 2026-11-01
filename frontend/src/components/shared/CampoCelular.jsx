import { useEffect, useRef, useState } from 'react'
import PhoneInput, { getCountryCallingCode } from 'react-phone-number-input/max'
import flags from 'react-phone-number-input/flags'
import es from 'react-phone-number-input/locale/es'
import 'react-phone-number-input/style.css'
import { getExampleNumber, parsePhoneNumber } from 'libphonenumber-js/max'
import ejemplosCelular from 'libphonenumber-js/mobile/examples'
import { celularE164 } from '@/lib/celular'
import SelectorPais from './SelectorPais'

const PAIS_POR_DEFECTO = 'CO'

const paisDe = (valor) => {
  try {
    return valor ? parsePhoneNumber(valor).country || PAIS_POR_DEFECTO : PAIS_POR_DEFECTO
  } catch {
    return PAIS_POR_DEFECTO
  }
}

// El número completo y válido con su país, o null.
const leerValido = (e164) => {
  try {
    const numero = parsePhoneNumber(e164)
    return numero.isValid() && numero.country ? numero : null
  } catch {
    return null
  }
}

// Si la persona escribió el indicativo a mano ('+57 300…', o '57 300…' con
// Colombia ya elegida), el número que de verdad quiso decir; si no, null.
const numeroConIndicativoEscrito = (nuevo, texto, pais) => {
  if (!nuevo) return null
  const numero = leerValido(nuevo)
  if (!numero || texto.trim().startsWith('+')) return numero
  // Con el país elegido, la librería ya lee '57 300…' como +57 300…, pero
  // en pantalla deja el 57.
  const digitos = texto.replace(/\D/g, '')
  return digitos !== numero.nationalNumber && digitos.startsWith(getCountryCallingCode(pais)) ? numero : null
}

// Un celular de ejemplo del país elegido, en su formato local (321 1234567, 222 123 4567…).
const ejemploDe = (pais) => getExampleNumber(pais, ejemplosCelular)?.formatNational() || ''

// Celular con selector de país (bandera) y el número en formato local.
// Recibe y entrega E.164 ('+573001234567'); '' cuando está vacío.
// Sin `placeholder`, muestra un celular de ejemplo del país elegido.
export default function CampoCelular({
  value,
  onChange,
  onBlur,
  invalido = false,
  className = '',
  placeholder,
  ...props
}) {
  // Lo que trae '+' viene del propio campo (incluso a medio escribir); sin
  // '+' es un número viejo de 10 dígitos que hay que pasar a E.164.
  const valorE164 = (String(value || '').startsWith('+') ? value : celularE164(value)) || undefined
  const [pais, setPais] = useState(() => paisDe(valorE164))
  // El campo solo muestra en formato local un valor inicial: para quitar el
  // indicativo escrito a mano se vuelve a montar con el número ya leído.
  const [montaje, setMontaje] = useState(0)
  const inputRef = useRef(null)
  const reenfocar = useRef(false)

  useEffect(() => {
    if (!reenfocar.current) return
    reenfocar.current = false
    const input = inputRef.current
    input?.focus()
    input?.setSelectionRange(input.value.length, input.value.length)
  }, [montaje])

  const cambiar = (nuevo) => {
    const numero = numeroConIndicativoEscrito(nuevo, inputRef.current?.value || '', pais)
    if (numero) {
      setPais(numero.country)
      reenfocar.current = true
      setMontaje((n) => n + 1)
      onChange(numero.number)
      return
    }
    onChange(nuevo || '')
  }

  return (
    <PhoneInput
      key={montaje}
      ref={inputRef}
      flags={flags}
      labels={es}
      defaultCountry={pais}
      // Un número ya guardado se muestra igual que al escribirlo: sin el
      // indicativo, que ya lo dice la bandera (por defecto saldría '+57 …').
      initialValueFormat="national"
      addInternationalOption={false}
      countryOptionsOrder={[PAIS_POR_DEFECTO, '|', '...']}
      countrySelectComponent={SelectorPais}
      value={valorE164}
      onChange={cambiar}
      onCountryChange={(nuevo) => setPais(nuevo || PAIS_POR_DEFECTO)}
      onBlur={onBlur}
      placeholder={placeholder ?? ejemploDe(pais)}
      autoComplete="tel"
      aria-invalid={invalido ? 'true' : undefined}
      className={`campo-celular flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 text-base text-foreground lg:text-[15px] transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
        invalido ? 'border-danger' : 'border-input'
      } ${className}`}
      numberInputProps={{
        className:
          'h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground',
      }}
      {...props}
    />
  )
}
