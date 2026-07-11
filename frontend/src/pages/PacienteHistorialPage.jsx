import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, PawPrint, Phone, User, Weight, FileText,
  HeartPulse, Lock, Pencil, CalendarDays, Stethoscope, Plus,
} from 'lucide-react'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import HistoriaClinicaFormDrawer from '@/features/historias/HistoriaClinicaFormDrawer'

const SPECIES_LABELS = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  conejo: 'Conejo',
  reptil: 'Reptil',
  otro: 'Otro',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded bg-muted/70 ${className}`} />
}

function PatientHeaderSkeleton() {
  return (
    <div className="border-b border-border bg-card px-6 py-5">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3.5 w-64" />
          <SkeletonBlock className="h-3.5 w-48" />
        </div>
      </div>
    </div>
  )
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
        className="mt-4 inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
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
              ? 'border-amber-400 bg-amber-100'
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
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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

export default function PacienteHistorialPage() {
  const { mascotaId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const suscripcion = useAuthStore((s) => s.suscripcion)
  const usuario = useAuthStore((s) => s.usuario)
  const featureSet = new Set(Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : [])

  const tieneHistorias = featureSet.has('historias')
  const tieneAntecedentes = featureSet.has('antecedentes')
  const puedeEditarHistorias = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])

  const citaIdParam = searchParams.get('citaId') || ''

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [historiaToEdit, setHistoriaToEdit] = useState(null)

  // Abrir drawer automáticamente si viene ?citaId desde la agenda
  useEffect(() => {
    if (citaIdParam && tieneHistorias && puedeEditarHistorias) {
      setHistoriaToEdit(null)
      setDrawerOpen(true)
    }
  }, [citaIdParam, tieneHistorias, puedeEditarHistorias])

  useEffect(() => {
    document.title = 'Historial clínico | Bourgelat'
  }, [])

  const mascotaQuery = useQuery({
    queryKey: ['paciente-perfil', mascotaId],
    queryFn: () => pacientesApi.obtenerMascota(mascotaId),
    enabled: Boolean(mascotaId),
  })

  const historiasQuery = useQuery({
    queryKey: ['paciente-historial', mascotaId],
    queryFn: () => historiasApi.obtenerHistoriasMascota(mascotaId),
    enabled: Boolean(mascotaId) && tieneHistorias,
  })

  const mascota = mascotaQuery.data?.mascota
  const historias = historiasQuery.data?.historias || []

  const handleNuevaConsulta = () => {
    setHistoriaToEdit(null)
    setDrawerOpen(true)
  }

  const handleEditHistoria = (historia) => {
    setHistoriaToEdit(historia)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setHistoriaToEdit(null)
    // Limpiar citaId de la URL para evitar que se re-abra al recargar
    if (citaIdParam) setSearchParams({})
  }

  const handleDrawerSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['paciente-historial', mascotaId] })
    // Solo cerrar al crear nueva historia; al editar/bloquear se deja el drawer abierto
    if (!historiaToEdit) {
      setDrawerOpen(false)
      if (citaIdParam) setSearchParams({})
    }
  }

  // Construir el objeto mascota en el formato que espera el drawer
  const mascotaParaDrawer = mascota
    ? {
        ...mascota,
        Propietario: mascota.Propietario || null,
      }
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de navegación contextual */}
      <div className="border-b border-border bg-card px-6 py-3">
        <button
          type="button"
          onClick={() => navigate('/pacientes')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Pacientes
        </button>
      </div>

      {/* Header del paciente */}
      {mascotaQuery.isPending && <PatientHeaderSkeleton />}
      {mascota && (
        <div className="border-b border-border bg-card px-6 py-5">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-start gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {mascota.fotoPerfil ? (
                  <img
                    src={mascota.fotoPerfil}
                    alt={mascota.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PawPrint className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold text-foreground">{mascota.nombre}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {SPECIES_LABELS[mascota.especie] || mascota.especie}
                  {mascota.raza ? ` · ${mascota.raza}` : ''}
                  {mascota.sexo && mascota.sexo !== 'desconocido' ? ` · ${mascota.sexo === 'macho' ? 'Macho' : 'Hembra'}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {mascota.Propietario?.nombre && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {mascota.Propietario.nombre}
                    </span>
                  )}
                  {mascota.Propietario?.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {mascota.Propietario.telefono}
                    </span>
                  )}
                  {mascota.peso && (
                    <span className="flex items-center gap-1">
                      <Weight className="h-3.5 w-3.5" />
                      {mascota.peso} kg
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2">
                {tieneHistorias && puedeEditarHistorias && (
                  <button
                    type="button"
                    onClick={handleNuevaConsulta}
                    className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva consulta
                  </button>
                )}
                {tieneAntecedentes && (
                  <button
                    type="button"
                    onClick={() => navigate(`/antecedentes?mascotaId=${mascotaId}`)}
                    className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <HeartPulse className="h-4 w-4" />
                    Antecedentes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {!historiasQuery.isPending && (
          <p className="mb-6 text-sm text-muted-foreground">
            {historias.length === 0
              ? 'Sin consultas registradas'
              : `${historias.length} consulta${historias.length !== 1 ? 's' : ''} registrada${historias.length !== 1 ? 's' : ''}`}
          </p>
        )}

        {historiasQuery.isPending && (
          <div className="relative space-y-4">
            <div className="absolute bottom-0 left-[9px] top-0 w-px bg-border" />
            <TimelineItemSkeleton />
            <TimelineItemSkeleton />
            <TimelineItemSkeleton />
          </div>
        )}

        {historiasQuery.isError && (
          <p className="text-sm text-rose-600">No fue posible cargar el historial clínico.</p>
        )}

        {historiasQuery.isSuccess && historias.length === 0 && (
          <EmptyTimeline onNuevaConsulta={handleNuevaConsulta} />
        )}

        {historiasQuery.isSuccess && historias.length > 0 && (
          <div className="relative space-y-4">
            <div className="absolute bottom-4 left-[9px] top-0 w-px bg-border" />

            {historias.map((historia) => (
              <TimelineCard
                key={historia.id}
                historia={historia}
                onEdit={handleEditHistoria}
              />
            ))}

            <div className="relative pl-8">
              <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center">
                <div className="h-3 w-3 rounded-full border-2 border-border bg-muted" />
              </div>
              <p className="py-1 text-xs text-muted-foreground">Inicio del historial</p>
            </div>
          </div>
        )}
      </div>

      {/* Drawer de historia clínica */}
      {mascotaParaDrawer && (
        <HistoriaClinicaFormDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          mascota={mascotaParaDrawer}
          citaIdInicial={historiaToEdit ? '' : citaIdParam}
          historiaToEdit={historiaToEdit}
          onSuccess={handleDrawerSuccess}
        />
      )}
    </div>
  )
}
