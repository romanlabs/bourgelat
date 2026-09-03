import {
  FileText, Lock, Pencil, CalendarDays, Stethoscope, Plus,
} from 'lucide-react'
import { SkeletonBlock } from '@/components/shared/SkeletonBlock'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function TimelineItemSkeleton() {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center">
        <SkeletonBlock className="h-3 w-3 rounded-full" />
      </div>
      <div className="space-y-2 border border-border bg-card px-4 py-4">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3.5 w-56" />
        <SkeletonBlock className="h-3.5 w-48" />
      </div>
    </div>
  )
}

function EmptyTimeline({ onNuevaConsulta }) {
  return (
    <div className="rounded border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <FileText className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm font-semibold text-foreground">Sin historias clínicas</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Este paciente aún no tiene consultas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevaConsulta}
        className="mt-4 inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar primera consulta
      </button>
    </div>
  )
}

function TimelineCard({ historia, onEdit }) {
  const { bloqueada, motivoConsulta, diagnostico, fechaConsulta, createdAt, veterinario } = historia

  return (
    <div className="relative pl-8">
      {/* Dot */}
      <div className="absolute left-0 top-4 flex h-5 w-5 items-center justify-center">
        <div
          className={`h-3 w-3 rounded-full border-2 ${
            bloqueada
              ? 'border-amber-400 bg-amber-100 dark:border-amber-500 dark:bg-amber-900/50'
              : 'border-primary bg-primary/20'
          }`}
        />
      </div>

      <div className="border border-border bg-card px-4 py-4 transition hover:bg-muted/30">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              {formatDate(fechaConsulta || createdAt)}
            </span>
            {veterinario?.nombre && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{veterinario.nombre}</span>
              </>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${
              bloqueada
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}
          >
            {bloqueada ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {bloqueada ? 'Bloqueada' : 'Editable'}
          </span>
        </div>

        {/* Content */}
        <div className="mt-3 space-y-1.5">
          {motivoConsulta && (
            <div className="flex items-start gap-2">
              <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <p className="line-clamp-1 text-sm text-foreground">
                <span className="font-medium">Motivo:</span> {motivoConsulta}
              </p>
            </div>
          )}
          {diagnostico && (
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <p className="line-clamp-1 text-sm text-foreground">
                <span className="font-medium">Diagnóstico:</span> {diagnostico}
              </p>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(historia)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary/80"
          >
            {bloqueada ? 'Ver detalle' : 'Ver / Editar'}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HistoriaClinicaTimeline({
  historias,
  isPending,
  onNuevaConsulta,
  onEditHistoria,
}) {
  if (isPending) {
    return (
      <div className="relative space-y-4">
        <div className="absolute bottom-0 left-[9px] top-0 w-px bg-border" />
        <TimelineItemSkeleton />
        <TimelineItemSkeleton />
        <TimelineItemSkeleton />
      </div>
    )
  }

  if (!historias.length) {
    return <EmptyTimeline onNuevaConsulta={onNuevaConsulta} />
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute bottom-4 left-[9px] top-0 w-px bg-border" />

      {historias.map((historia) => (
        <TimelineCard
          key={historia.id}
          historia={historia}
          onEdit={onEditHistoria}
        />
      ))}

      <div className="relative pl-8">
        <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center">
          <div className="h-3 w-3 rounded-full border-2 border-border bg-muted" />
        </div>
        <p className="py-1 text-xs text-muted-foreground">Inicio del historial</p>
      </div>
    </div>
  )
}
