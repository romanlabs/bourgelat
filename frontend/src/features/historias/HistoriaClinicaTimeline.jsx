import {
  FileText, Lock, Pencil, CalendarDays, Stethoscope, Plus, Printer,
} from 'lucide-react'
import { SkeletonBlock } from '@/components/shared/SkeletonBlock'
import { tienePlanFarmacologico } from './formulaPdf'

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
      <div className="space-y-2 rounded-2xl bg-card px-5 py-4">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3.5 w-56" />
        <SkeletonBlock className="h-3.5 w-48" />
      </div>
    </div>
  )
}

function EmptyTimeline({ onNuevaConsulta }) {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary"><FileText className="h-6 w-6" /></span>
      <p className="text-lg font-semibold tracking-[-0.01em] text-foreground">Sin historias clínicas</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Este paciente aún no tiene consultas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevaConsulta}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar primera consulta
      </button>
    </div>
  )
}

function TimelineCard({
  historia, onEdit, onImprimirFormula, imprimiendo, onImprimirHistoria, imprimiendoHistoria,
}) {
  const { bloqueada, motivoConsulta, diagnostico, fechaConsulta, createdAt, veterinario } = historia

  return (
    <div className="relative pl-8">
      {/* Dot */}
      <div className="absolute left-0 top-4 flex h-5 w-5 items-center justify-center">
        <div
          className={`h-3 w-3 rounded-full border-2 ${
            bloqueada
              ? 'border-warning bg-warning-soft'
              : 'border-primary bg-accent'
          }`}
        />
      </div>

      <div className="rounded-2xl bg-card px-5 py-4">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {formatDate(fechaConsulta || createdAt)}
            </span>
            {veterinario?.nombre && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-[13px] text-muted-foreground">{veterinario.nombre}</span>
              </>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold ${
              bloqueada
                ? 'bg-warning-soft text-warning'
                : 'bg-success-soft text-success'
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
        <div className="mt-3 flex flex-wrap items-center justify-end gap-4">
          {onImprimirFormula && tienePlanFarmacologico(historia) && (
            <button
              type="button"
              onClick={() => onImprimirFormula(historia.id)}
              disabled={imprimiendo}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
            >
              <Printer className="h-3.5 w-3.5" />
              {imprimiendo ? 'Generando...' : 'Imprimir fórmula'}
            </button>
          )}
          {onImprimirHistoria && (
            <button
              type="button"
              onClick={() => onImprimirHistoria(historia.id)}
              disabled={imprimiendoHistoria}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
            >
              <FileText className="h-3.5 w-3.5" />
              {imprimiendoHistoria ? 'Generando...' : 'Imprimir historia'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(historia)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
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
  onImprimirFormula,
  historiaImprimiendo = null,
  onImprimirHistoria,
  historiaImprimiendoCompleta = null,
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
          onImprimirFormula={onImprimirFormula}
          imprimiendo={historiaImprimiendo === historia.id}
          onImprimirHistoria={onImprimirHistoria}
          imprimiendoHistoria={historiaImprimiendoCompleta === historia.id}
        />
      ))}

      <div className="relative pl-8">
        <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center">
          <div className="h-3 w-3 rounded-full border-2 border-border bg-muted" />
        </div>
        <p className="py-1 text-[13px] text-muted-foreground">Inicio del historial</p>
      </div>
    </div>
  )
}
