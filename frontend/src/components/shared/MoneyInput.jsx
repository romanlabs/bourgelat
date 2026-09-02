const milesFormatter = new Intl.NumberFormat('es-CO')

const displayMiles = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  return Number.isFinite(num) ? milesFormatter.format(num) : ''
}

// Campo numerico con separador de miles en vivo (guarda el numero crudo, sin decimales)
export default function MoneyInput({
  id,
  value,
  onChange,
  hasError,
  prefix,
  suffix,
  placeholder,
  autoFocus,
  className,
}) {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    onChange(raw === '' ? 0 : Number(raw))
  }

  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayMiles(value)}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={
          className ??
          `h-11 w-full border bg-card text-sm tabular-nums text-foreground outline-none transition focus:border-primary ${
            prefix ? 'pl-7' : 'pl-3'
          } ${suffix ? 'pr-14' : 'pr-3'} ${hasError ? 'border-red-400 dark:border-red-500/70' : 'border-border'}`
        }
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}
