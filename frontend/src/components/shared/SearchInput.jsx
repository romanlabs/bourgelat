import { Loader2, Search, X } from 'lucide-react'

/**
 * Campo de busqueda compartido. Unifica el markup que estaba duplicado en los
 * tabs de Pacientes y Tutores, y anade lo que faltaba: indicador de carga
 * mientras se refresca (con placeholderData la tabla conserva datos viejos y
 * parecia congelada), boton de limpiar, etiqueta accesible y tope de longitud
 * alineado con el validador del backend (120 caracteres).
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar',
  ariaLabel,
  cargando = false,
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        maxLength={120}
        className="h-10 w-full border border-border bg-card pl-10 pr-9 text-sm text-foreground outline-none transition focus:border-primary [&::-webkit-search-cancel-button]:appearance-none"
      />
      {cargando ? (
        <Loader2
          aria-hidden="true"
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      ) : value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar busqueda"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
