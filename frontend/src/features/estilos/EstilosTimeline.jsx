import { CalendarDays, Lock, Pencil, Plus, Scissors } from 'lucide-react'

const formatDate = (value) => {
  if (!value) return '—'
  // fechaServicio/proximaCitaSugerida llegan como fecha sin hora
  // (YYYY-MM-DD). `new Date('2026-09-01')` se interpreta como UTC medianoche
  // y en America/Bogota (UTC-5) cae un dia antes. Anclar a medianoche local
  // evita ese corrimiento — mismo patron que lib/utils.js y dashboardUtils.js.
  const s = String(value)
  const isoLocal = s.includes('T') ? s : `${s}T00:00:00`
  const date = new Date(isoLocal)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date)
}

function EmptyEstilos({ onNuevoRegistro }) {
  return (
    <div className="rounded border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <Scissors className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm font-semibold text-foreground">Sin servicios de estilos</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Este paciente aún no tiene peluqueadas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevoRegistro}
        className="mt-4 inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar primer servicio
      </button>
    </div>
  )
}

function EstiloCard({ registro, onEdit }) {
  const { bloqueado, tipoCorte, fechaServicio, estilista, proximaCitaSugerida } = registro

  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-4 flex h-5 w-5 items-center justify-center">
        <div className={`h-3 w-3 rounded-full border-2 ${
          bloqueado ? 'border-amber-400 bg-amber-100' : 'border-primary bg-primary/20'
        }`} />
      </div>

      <div className="border border-border bg-card px-4 py-4 transition hover:bg-muted/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              {formatDate(fechaServicio)}
            </span>
            {estilista?.nombre && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{estilista.nombre}</span>
              </>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${
            bloqueado
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {bloqueado ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {bloqueado ? 'Facturado' : 'Editable'}
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <Scissors className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Corte:</span> {tipoCorte}
            </p>
          </div>
          {proximaCitaSugerida && (
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Próxima cita sugerida: {formatDate(proximaCitaSugerida)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(registro)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary/80"
          >
            {bloqueado ? 'Ver detalle' : 'Ver / Editar'}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EstilosTimeline({ registros, isPending, onNuevoRegistro, onEditRegistro }) {
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded bg-muted/70" />
        <div className="h-24 animate-pulse rounded bg-muted/70" />
      </div>
    )
  }

  if (!registros.length) {
    return <EmptyEstilos onNuevoRegistro={onNuevoRegistro} />
  }

  return (
    <div className="space-y-4">
      {registros.map((registro) => (
        <EstiloCard key={registro.id} registro={registro} onEdit={onEditRegistro} />
      ))}
    </div>
  )
}
