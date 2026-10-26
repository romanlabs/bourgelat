import PhoneInput from 'react-phone-number-input/max'
import flags from 'react-phone-number-input/flags'
import es from 'react-phone-number-input/locale/es'
import 'react-phone-number-input/style.css'
import { celularE164 } from '@/lib/celular'

// Celular con selector de país (bandera) y el número en formato local.
// Recibe y entrega E.164 ('+573001234567'); '' cuando está vacío.
export default function CampoCelular({ value, onChange, onBlur, invalido = false, className = '', ...props }) {
  return (
    <PhoneInput
      flags={flags}
      labels={es}
      defaultCountry="CO"
      countryOptionsOrder={['CO', '|', '...']}
      // Lo que trae '+' viene del propio campo (incluso a medio escribir); sin
      // '+' es un número viejo de 10 dígitos que hay que pasar a E.164.
      value={(String(value || '').startsWith('+') ? value : celularE164(value)) || undefined}
      onChange={(nuevo) => onChange(nuevo || '')}
      onBlur={onBlur}
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
