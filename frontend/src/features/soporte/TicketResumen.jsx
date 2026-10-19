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
        'w-full rounded-xl px-3 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        activo && 'bg-accent hover:bg-accent'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] text-muted-foreground">{ticket.codigo}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{ticket.asunto}</p>
        </div>
        <EstadoTicketBadge estado={ticket.estado} size="sm" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
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
