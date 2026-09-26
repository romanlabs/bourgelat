import { cn } from '@/lib/utils'
import { ESTADOS_TICKET } from './soporteConstants'

export default function EstadoTicketBadge({ estado, size = 'md', className }) {
  const config = ESTADOS_TICKET[estado] || { ...ESTADOS_TICKET.cerrado, label: estado }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        config.tone,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden />
      {config.label}
    </span>
  )
}
