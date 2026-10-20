import { Popover } from 'radix-ui'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { buildTipoTone, TIPOS_LEYENDA } from './calendarConstants'

// Leyenda por tipo de cita, en un botón para no gastar una fila del
// calendario. El estado se lee en la propia cita: atendida y cancelada
// aparecen apagadas, en atención con anillo y en espera con punto ámbar.
export function CalendarLegend() {
  return (
    <Popover.Root>
      <SimpleTooltip label="Colores de las citas">
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Colores de las citas"
            className="flex h-10 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary"
          >
            <Palette className="h-[18px] w-[18px]" />
          </button>
        </Popover.Trigger>
      </SimpleTooltip>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-xl bg-popover p-3 shadow-dropdown"
        >
          <p className="mb-2 text-[13px] font-semibold text-foreground">Tipo de cita</p>
          <ul className="flex flex-col gap-2">
            {TIPOS_LEYENDA.map(({ value, label }) => (
              <li key={value} className="flex items-center gap-2.5">
                <span className={cn('h-4 w-4 rounded', buildTipoTone(value))} />
                <span className="text-sm text-foreground">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-3 text-[13px] font-semibold text-foreground">Estado</p>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>Atendida: más clara</li>
            <li>Cancelada o no asistió: tachada</li>
            <li>En atención: borde petróleo</li>
            <li>En espera: punto ámbar</li>
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
