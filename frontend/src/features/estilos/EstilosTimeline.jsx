import { Lock, Plus, Scissors } from 'lucide-react'
import { nombreAutor } from '@/lib/equipo'

// proximaCitaSugerida es DATEONLY ("2026-09-01"); fechaServicio es DATE y
// llega como timestamp UTC ("2026-08-24T00:00:00.000Z"). En ambos casos el
// dia calendario que se debe mostrar son los primeros 10 caracteres
// (YYYY-MM-DD): el backend corre en UTC en produccion (Render) y guarda esa
// fecha como medianoche UTC del dia que el usuario eligio en Bogota
// (UTC-5). Si se deja pasar el timestamp completo, `new Date(...)` conserva
// el instante UTC y `Intl.DateTimeFormat` lo renderiza en la zona del
// navegador, corriendo el dia un dia atras. Anclar a medianoche local evita
// ese corrimiento — mismo patron que lib/utils.js y dashboardUtils.js.
const aFechaLocal = (value) => {
  if (!value) return null
  const diaCalendario = String(value).slice(0, 10)
  const date = new Date(`${diaCalendario}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = aFechaLocal(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date)
}

const partesFecha = (value) => {
  const date = aFechaLocal(value)
  if (!date) return { dia: '—', resto: '' }
  return {
    dia: String(date.getDate()),
    resto: new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(date),
  }
}

function EmptyEstilos({ onNuevoRegistro }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-muted-foreground">
        <Scissors className="h-5 w-5" />
      </span>
      <p className="mt-4 text-base font-semibold text-foreground">Sin servicios de estilos</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Este paciente aún no tiene peluqueadas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevoRegistro}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-4 w-4" />
        Registrar primer servicio
      </button>
    </div>
  )
}

function EstiloCard({ registro, onEdit }) {
  const { bloqueado, tipoCorte, fechaServicio, estilista, proximaCitaSugerida } = registro
  const { dia, resto } = partesFecha(fechaServicio)

  return (
    <button
      type="button"
      onClick={() => onEdit(registro)}
      className="grid w-full grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-xl px-4 py-4 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{dia}</span>
        <span className="text-[13px] text-muted-foreground">{resto}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="text-[17px] font-semibold text-foreground">{tipoCorte || 'Servicio de estilos'}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[13px] font-semibold ${
              bloqueado ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
            }`}
          >
            {bloqueado ? <Lock className="h-3 w-3" /> : null}
            {bloqueado ? 'Facturado' : 'Editable'}
          </span>
        </span>
        {proximaCitaSugerida ? (
          <span className="text-[15px] text-foreground/80">
            Próxima cita sugerida: {formatDate(proximaCitaSugerida)}
          </span>
        ) : null}
        <span className="text-[13px] text-muted-foreground">
          {[nombreAutor(estilista), bloqueado ? 'Ver detalle' : 'Ver o editar'].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

export default function EstilosTimeline({ registros, isPending, onNuevoRegistro, onEditRegistro }) {
  if (isPending) {
    return (
      <div className="space-y-2">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!registros.length) {
    return <EmptyEstilos onNuevoRegistro={onNuevoRegistro} />
  }

  return (
    <div className="flex flex-col gap-1.5">
      {registros.map((registro) => (
        <EstiloCard key={registro.id} registro={registro} onEdit={onEditRegistro} />
      ))}
    </div>
  )
}
