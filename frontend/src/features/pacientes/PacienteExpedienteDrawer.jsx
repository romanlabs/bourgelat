import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FileText, HeartPulse, PawPrint, X } from 'lucide-react'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { historiasApi } from '@/features/historias/historiasApi'
import AntecedentesResumen from './AntecedentesResumen'

// ─── Helpers locales ─────────────────────────────────────────────────────────

const formatClinicalDateTime = (value) => {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const buildHistoryStatusTone = (bloqueada) =>
  bloqueada
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-muted/70"
          style={{ width: `${75 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  )
}

function ErrorBanner({ message }) {
  return <p className="text-sm text-rose-600">{message}</p>
}

function HistoriasEmptyState() {
  return (
    <div className="rounded border border-dashed border-border bg-muted/40 px-4 py-6 text-center">
      <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">Sin historias clínicas registradas.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Las historias se registran al completar una cita desde Agenda.
      </p>
    </div>
  )
}

function HistoriasResumen({ historias, historiasTo }) {
  const recientes = historias.slice(0, 3)
  return (
    <div className="space-y-2">
      {recientes.map((h) => (
        <div key={h.id} className="border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-sm font-semibold text-foreground">
              {h.motivoConsulta || 'Consulta'}
            </p>
            <span
              className={`inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${buildHistoryStatusTone(h.bloqueada)}`}
            >
              {h.bloqueada ? 'Bloqueada' : 'Editable'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatClinicalDateTime(h.fechaConsulta || h.createdAt)}
          </p>
          {h.diagnostico && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground">{h.diagnostico}</p>
          )}
        </div>
      ))}
      {historias.length > 3 && (
        <p className="text-xs text-muted-foreground">+{historias.length - 3} más</p>
      )}
      {historiasTo && (
        <Link
          to={historiasTo}
          className="block pt-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
        >
          Ver historial completo →
        </Link>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PacienteExpedienteDrawer({ open, mascota, featureSet, onClose }) {
  const mascotaId = mascota?.id

  const tieneHistorias = featureSet?.has('historias')
  const tieneAntecedentes = featureSet?.has('antecedentes')

  const antecedentesQuery = useQuery({
    queryKey: ['expediente-antecedentes', mascotaId],
    queryFn: () => antecedentesApi.obtenerAntecedentes(mascotaId),
    enabled: open && Boolean(mascotaId) && tieneAntecedentes,
  })

  const historiasQuery = useQuery({
    queryKey: ['expediente-historias', mascotaId],
    queryFn: () => historiasApi.obtenerHistoriasMascota(mascotaId),
    enabled: open && Boolean(mascotaId) && tieneHistorias,
  })

  const historias = historiasQuery.data?.historias || []

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Expediente del paciente"
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[600px] sm:border-l sm:border-border ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {mascota?.fotoPerfil ? (
              <img
                src={mascota.fotoPerfil}
                alt={mascota.paciente}
                className="h-full w-full object-cover"
              />
            ) : (
              <PawPrint className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{mascota?.paciente}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {mascota?.especie}
              {mascota?.raza ? ` / ${mascota.raza}` : ''}
              {mascota?.tutor ? ` · ${mascota.tutor}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[
                mascota?.edad !== 'Sin edad' && mascota?.edad,
                mascota?.color !== 'Sin color' && mascota?.color,
                mascota?.peso !== 'Sin peso' && mascota?.peso,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {mascota?.fichaTone && (
            <StatusPill tone={mascota.fichaTone}>{mascota.fichaLabel}</StatusPill>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar expediente"
            className="ml-1 shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Sección antecedentes */}
          {tieneAntecedentes && (
            <section className="border-b border-border px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-600" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Antecedentes
                </p>
              </div>
              {antecedentesQuery.isPending && <LoadingSkeleton lines={3} />}
              {antecedentesQuery.isError && (
                <ErrorBanner message="No fue posible cargar los antecedentes." />
              )}
              {antecedentesQuery.isSuccess && (
                <AntecedentesResumen
                  antecedentes={antecedentesQuery.data?.antecedentes}
                  mascotaId={mascotaId}
                />
              )}
            </section>
          )}

          {/* Sección historial clínico */}
          {tieneHistorias && (
            <section className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-600" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Historial clínico
                </p>
                {historias.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {historias.length} registro{historias.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {historiasQuery.isPending && <LoadingSkeleton lines={4} />}
              {historiasQuery.isError && (
                <ErrorBanner message="No fue posible cargar el historial clínico." />
              )}
              {historiasQuery.isSuccess && historias.length === 0 && <HistoriasEmptyState />}
              {historiasQuery.isSuccess && historias.length > 0 && (
                <HistoriasResumen historias={historias} historiasTo={mascota?.historiasTo} />
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          {tieneHistorias && mascota?.historiasTo && (
            <Link
              to={mascota.historiasTo}
              className="flex flex-1 items-center justify-center gap-2 border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Ver historias
            </Link>
          )}
          {tieneAntecedentes && mascota?.antecedentesTo && (
            <Link
              to={mascota.antecedentesTo}
              className="flex flex-1 items-center justify-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <HeartPulse className="h-4 w-4" />
              Ver antecedentes
            </Link>
          )}
          {!tieneHistorias && !tieneAntecedentes && mascota?.raw?.Propietario?.id && (
            <Link
              to={`/agenda?propietarioId=${mascota.raw.Propietario.id}`}
              className="flex flex-1 items-center justify-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <CalendarClock className="h-4 w-4" />
              Ver en Agenda
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/80"
          >
            Cerrar
          </button>
        </div>
      </aside>
    </>,
    document.body
  )
}
