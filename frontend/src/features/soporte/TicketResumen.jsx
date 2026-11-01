import { cn } from '@/lib/utils'
import EstadoTicketBadge from './EstadoTicketBadge'
import { etiquetaCategoria, formatearActividad } from './soporteConstants'

// Fila de una bandeja de tickets. Solo depende de los datos que recibe, para
// reutilizarse tal cual en el panel del equipo de soporte (que además trae
// `ticket.clinica`).
export default function TicketResumen({ ticket, activo = false, mostrarAutor = false, onSelect }) {
  const detalle = [
    ticket.codigo,
    etiquetaCategoria(ticket.categoria),
    formatearActividad(ticket.ultimaActividadAt),
    ticket.clinica?.nombre,
    mostrarAutor && ticket.creadoPor ? `por ${ticket.creadoPor.nombre}` : null,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(ticket.id)}
      aria-current={activo ? 'true' : undefined}
      className={cn(
        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl min-h-[60px] px-3 py-3 text-left sm:px-4 sm:py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
        activo && 'bg-primary/10 hover:bg-primary/10'
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold text-foreground">{ticket.asunto}</span>
        <span className="truncate text-[13px] text-muted-foreground">{detalle.join(' · ')}</span>
      </span>
      <EstadoTicketBadge estado={ticket.estado} size="sm" />
    </button>
  )
}
