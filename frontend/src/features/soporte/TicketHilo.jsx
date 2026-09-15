import { LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatearFechaTicket } from './soporteConstants'

// Hilo de un ticket. `perspectiva` decide que mensajes son "propios" (a la
// derecha): la clinica ve a la derecha lo que escribio su equipo; el panel del
// equipo de soporte (a futuro) usara perspectiva="soporte" y el mismo
// componente.
export default function TicketHilo({ mensajes = [], perspectiva = 'clinica' }) {
  return (
    <ol className="space-y-4" aria-label="Conversación del ticket">
      {mensajes.map((mensaje) =>
        mensaje.autorTipo === 'sistema' ? (
          <li key={mensaje.id} className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-center">
              {mensaje.mensaje} · {formatearFechaTicket(mensaje.createdAt)}
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </li>
        ) : (
          <MensajeHilo key={mensaje.id} mensaje={mensaje} perspectiva={perspectiva} />
        )
      )}
    </ol>
  )
}

function MensajeHilo({ mensaje, perspectiva }) {
  const esSoporte = mensaje.autorTipo === 'soporte'
  const propio = perspectiva === 'soporte' ? esSoporte : !esSoporte

  return (
    <li className={cn('flex', propio ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] min-w-0', propio ? 'items-end text-right' : 'items-start')}>
        <div className={cn('mb-1 flex items-center gap-1.5 text-xs', propio ? 'justify-end' : 'justify-start')}>
          {esSoporte ? <LifeBuoy className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
          <span className="font-semibold text-foreground">
            {esSoporte ? `Equipo Bourgelat · ${mensaje.autorNombre}` : mensaje.autorNombre}
          </span>
          <span className="text-muted-foreground">{formatearFechaTicket(mensaje.createdAt)}</span>
        </div>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed text-foreground',
            propio
              ? 'rounded-tr-sm border-primary/20 bg-primary/10'
              : esSoporte
                ? 'rounded-tl-sm border-border bg-card shadow-sm'
                : 'rounded-tl-sm border-border bg-muted/60'
          )}
        >
          {mensaje.mensaje}
        </div>
      </div>
    </li>
  )
}
