import { Select } from '@/components/ui/select'
import { to12h, to24h, HORAS_12, MINUTOS_15, PERIODOS } from '@/lib/hora'

/**
 * Selector de hora en formato de 12 horas (hora / minutos / AM-PM).
 *
 * `<input type="time">` no sirve aqui: su presentacion depende del locale del
 * navegador y no admite forzar 12 horas. Este componente emite y recibe siempre
 * 'HH:MM' en 24 horas, que es lo que viaja a la API.
 *
 * @param {{
 *   value: string,
 *   onChange: (valor: string) => void,
 *   disabled?: boolean,
 *   'aria-label'?: string,
 * }} props
 */
export function HoraPicker({ value, onChange, disabled = false, 'aria-label': ariaLabel }) {
  const { hora, minuto, periodo } = to12h(value)

  const emitir = (cambios) =>
    onChange(to24h({ hora, minuto, periodo, ...cambios }))

  // Un valor que no cae en la rejilla de 15 minutos (p. ej. una cita creada
  // antes) igual debe poder mostrarse en vez de dejar el campo en blanco.
  const minutos = MINUTOS_15.includes(minuto)
    ? MINUTOS_15
    : [...MINUTOS_15, minuto].sort((a, b) => a - b)

  return (
    <div className="flex items-center gap-1.5">
      <Select
        variant="field"
        className="w-[72px] shrink-0"
        aria-label={ariaLabel ? `${ariaLabel}: hora` : 'Hora'}
        disabled={disabled}
        value={String(hora)}
        onValueChange={(valor) => emitir({ hora: Number(valor) })}
        options={HORAS_12.map((item) => ({ value: String(item), label: String(item) }))}
      />
      <span className="text-sm font-semibold text-muted-foreground">:</span>
      <Select
        variant="field"
        className="w-[72px] shrink-0"
        aria-label={ariaLabel ? `${ariaLabel}: minutos` : 'Minutos'}
        disabled={disabled}
        value={String(minuto)}
        onValueChange={(valor) => emitir({ minuto: Number(valor) })}
        options={minutos.map((item) => ({
          value: String(item),
          label: String(item).padStart(2, '0'),
        }))}
      />
      <Select
        variant="field"
        className="w-[72px] shrink-0"
        aria-label={ariaLabel ? `${ariaLabel}: AM o PM` : 'AM o PM'}
        disabled={disabled}
        value={periodo}
        onValueChange={(valor) => emitir({ periodo: valor })}
        options={PERIODOS.map((item) => ({
          value: item,
          label: item === 'AM' ? 'a. m.' : 'p. m.',
        }))}
      />
    </div>
  )
}
