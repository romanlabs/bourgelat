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
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        maxLength={120}
        className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-base text-foreground lg:text-[15px] outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
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
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
