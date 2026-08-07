import { cn } from '@/lib/utils'
import { buildStateTone, getAccentColor, STATUS_OPTIONS } from './calendarConstants'

export function CalendarLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
      {STATUS_OPTIONS.map(({ value, label }) => (
        <div key={value} className="flex items-center gap-1.5">
          <div
            className={cn('h-3 w-3 rounded-sm border-y border-r', buildStateTone(value))}
            style={{ borderLeftWidth: '3px', borderLeftColor: getAccentColor(value) }}
          />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="h-3 w-3 rounded-sm border-y border-r border-dashed border-red-500 bg-red-50 dark:bg-red-900/20" />
        <span className="text-[11px] text-muted-foreground">Urgencia</span>
      </div>
    </div>
  )
}
