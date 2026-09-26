import { cn } from '@/lib/utils'
import EstadoTicketBadge from './EstadoTicketBadge'
import { formatearActividad, prioridadTicket } from './soporteConstants'

// Fila de una bandeja de tickets. Solo depende de los datos que recibe, para
// reutilizarse tal cual en el panel del equipo de soporte (que ademas trae
// `ticket.clinica`).
export default function TicketResumen({ ticket, activo = false, mostrarAutor = false, onSelect }) {
  const prioridad = prioridadTicket(ticket.prioridad)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(ticket.id)}
      aria-current={activo ? 'true' : undefined}
      className={cn(
        'w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none',
        activo && 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-muted-foreground">{ticket.codigo}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{ticket.asunto}</p>
        </div>
        <EstadoTicketBadge estado={ticket.estado} size="sm" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', prioridad.dot)} aria-hidden />
          {prioridad.label}
        </span>
        <span>{formatearActividad(ticket.ultimaActividadAt)}</span>
        {ticket.clinica ? <span className="truncate">{ticket.clinica.nombre}</span> : null}
        {mostrarAutor && ticket.creadoPor ? <span className="truncate">por {ticket.creadoPor.nombre}</span> : null}
      </div>
    </button>
  )
}
