import { useState } from 'react'
import PhoneInput from 'react-phone-number-input/max'
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

  return (
    <PhoneInput
      flags={flags}
      labels={es}
      defaultCountry={PAIS_POR_DEFECTO}
      addInternationalOption={false}
      countryOptionsOrder={[PAIS_POR_DEFECTO, '|', '...']}
      countrySelectComponent={SelectorPais}
      value={valorE164}
      onChange={(nuevo) => onChange(nuevo || '')}
      onCountryChange={(nuevo) => setPais(nuevo || PAIS_POR_DEFECTO)}
      onBlur={onBlur}
      placeholder={placeholder ?? ejemploDe(pais)}
      autoComplete="tel"
      aria-invalid={invalido ? 'true' : undefined}
      className={`campo-celular flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 text-[15px] text-foreground transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
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
