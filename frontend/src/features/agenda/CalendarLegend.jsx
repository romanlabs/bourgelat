import { cn } from '@/lib/utils'
import { buildStateTone, URGENCIA_ACCENT, STATUS_OPTIONS } from './calendarConstants'

export function CalendarLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1">
      {STATUS_OPTIONS.map(({ value, label }) => (
        <div key={value} className="flex items-center gap-2">
          <div className={cn('h-3.5 w-3.5 rounded', buildStateTone(value))} />
          <span className="text-[13px] text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div
          className="h-3.5 w-3.5 rounded bg-secondary"
          style={{ boxShadow: `inset 3px 0 0 ${URGENCIA_ACCENT}` }}
        />
        <span className="text-[13px] text-muted-foreground">Urgencia</span>
      </div>
    </div>
  )
}
