import { cn } from '@/lib/utils'
import { buildTipoTone, TIPOS_LEYENDA } from './calendarConstants'

// Leyenda por tipo de cita. El estado se lee en la propia cita: atendida y
// cancelada aparecen apagadas, en atención con anillo y en espera con punto ámbar.
export function CalendarLegend({ className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {TIPOS_LEYENDA.map(({ value, label }) => (
        <div key={value} className="flex items-center gap-2">
          <span className={cn('h-3.5 w-3.5 rounded', buildTipoTone(value))} />
          <span className="text-[13px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
