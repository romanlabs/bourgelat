import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { toast } from 'sonner'
import { FlaskConical, Paperclip, Plus, X } from 'lucide-react'
import { examenesLaboratorioApi } from '@/features/examenesLaboratorio/examenesLaboratorioApi'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { nombreAutor } from '@/lib/equipo'

const TIPOS_EXAMEN_SUGERIDOS = [
  'Hemograma', 'Perfil renal', 'Perfil hepático', 'Uroanálisis',
  'Coprológico', 'Citología', 'Radiografía', 'Ecografía',
]

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const formatFecha = (value) => {
  if (!value) return 'Sin fecha'
  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(Number(year), Number(month) - 1, Number(day)))
}

const createDefaultForm = () => ({
  tipo: '',
  fecha: '',
  resultados: '',
  interpretacion: '',
  laboratorio: '',
})

// ─── Modal de registro/edición ────────────────────────────────────────────────

// El adjunto ya no tiene URL publica: se descarga con la sesion y se abre en
// una pestaña nueva. La pestaña se abre dentro del clic, antes de la descarga,
// para que el navegador no la bloquee como ventana emergente.
async function abrirAdjunto(examen) {
  const ventana = window.open('', '_blank')
  try {
    const blob = await examenesLaboratorioApi.obtenerArchivo(examen.id)
    const url = URL.createObjectURL(blob)
    if (ventana) {
      ventana.location.href = url
    } else {
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = examen.archivoNombre || 'adjunto'
      enlace.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    ventana?.close()
    toast.error('No se pudo abrir el adjunto. Intenta de nuevo.')
  }
}

function ExamenFormModal({ open, examen, mascotaId, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(createDefaultForm)
  const [archivo, setArchivo] = useState(null)
  const [initializedFor, setInitializedFor] = useState(null)

  const editKey = examen?.id || 'nuevo'
  if (open && initializedFor !== editKey) {
    setInitializedFor(editKey)
    setArchivo(null)
    setForm(examen ? {
      tipo: examen.tipo || '',
      fecha: examen.fecha || '',
      resultados: examen.resultados || '',
      interpretacion: examen.interpretacion || '',
      laboratorio: examen.laboratorio || '',
    } : createDefaultForm())
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null)
  }

  const guardarMutation = useMutation({
    mutationFn: () =>
      examen?.id
        ? examenesLaboratorioApi.editarExamen(examen.id, form, archivo)
        : examenesLaboratorioApi.crearExamen(mascotaId, form, archivo),
    onSuccess: (data) => {
      toast.success(data?.message || 'Examen guardado exitosamente')
      invalidarDominios(queryClient, 'historias')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible guardar el examen.'))
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.tipo.trim() || !form.fecha || !form.resultados.trim()) {
      toast.error('Completa tipo de examen, fecha y resultados.')
      return
    }
    guardarMutation.mutate()
  }

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={examen ? 'Editar examen de laboratorio' : 'Registrar examen de laboratorio'}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            {examen ? 'Editar examen de laboratorio' : 'Registrar examen de laboratorio'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-1">
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setForm((c) => ({ ...c, tipo: e.target.value }))}
              placeholder="Tipo de examen"
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TIPOS_EXAMEN_SUGERIDOS.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, tipo }))}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[13px] font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    form.tipo === tipo
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[13px] text-muted-foreground">Fecha del examen</p>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((c) => ({ ...c, fecha: e.target.value }))}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] text-muted-foreground">Laboratorio (opcional)</p>
              <input
                type="text"
                value={form.laboratorio}
                onChange={(e) => setForm((c) => ({ ...c, laboratorio: e.target.value }))}
                placeholder="Laboratorio externo"
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <textarea
            value={form.resultados}
            onChange={(e) => setForm((c) => ({ ...c, resultados: e.target.value }))}
            placeholder="Resultados del examen"
            className="min-h-[100px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            value={form.interpretacion}
            onChange={(e) => setForm((c) => ({ ...c, interpretacion: e.target.value }))}
            placeholder="Interpretación clínica (opcional)"
            className="min-h-[70px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div>
            <p className="mb-1.5 text-[13px] text-muted-foreground">
              Adjunto (PDF o imagen, máx. 8 MB) — opcional
            </p>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-secondary-foreground"
            />
            {examen?.archivoNombre && !archivo && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Adjunto actual: {examen.archivoNombre} (se conserva si no seleccionas otro)
              </p>
            )}
          </div>

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>

        <div className="flex gap-2.5 px-6 pb-5 pt-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardarMutation.isPending}
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardarMutation.isPending ? 'Guardando...' : examen ? 'Guardar cambios' : 'Registrar examen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Sección de listado ───────────────────────────────────────────────────────

export default function ExamenesLaboratorioSection({ mascotaId, puedeEditar = false, puedeEliminar = false }) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [examenEnEdicion, setExamenEnEdicion] = useState(null)
  const [examenAEliminar, setExamenAEliminar] = useState(null)

  const examenesQuery = useQuery({
    queryKey: ['examenes-laboratorio', mascotaId],
    queryFn: () => examenesLaboratorioApi.obtenerExamenes(mascotaId),
    enabled: Boolean(mascotaId),
    placeholderData: (prev) => prev,
  })

  const eliminarMutation = useMutation({
    mutationFn: examenesLaboratorioApi.eliminarExamen,
    onSuccess: (data) => {
      toast.success(data?.message || 'Examen eliminado exitosamente')
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible eliminar el examen.'))
    },
  })

  const examenes = examenesQuery.data?.examenes || []

  const abrirCrear = () => { setExamenEnEdicion(null); setModalOpen(true) }
  const abrirEditar = (examen) => { setExamenEnEdicion(examen); setModalOpen(true) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-foreground">
          Exámenes de laboratorio
        </p>
        {puedeEditar && (
          <button
            type="button"
            onClick={abrirCrear}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" /> Registrar examen
          </button>
        )}
      </div>

      {examenesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando exámenes...</p>
      ) : examenesQuery.isError ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">No fue posible cargar los exámenes.</p>
      ) : examenes.length === 0 ? (
        <div className="rounded-xl bg-muted px-4 py-5 text-center">
          <FlaskConical className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sin exámenes de laboratorio registrados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {examenes.map((examen) => (
            <div key={examen.id} className="rounded-xl bg-muted px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{examen.tipo}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {formatFecha(examen.fecha)}
                    {examen.laboratorio ? ` · ${examen.laboratorio}` : ''}
                    {examen.registradoPor?.nombre ? ` · ${nombreAutor(examen.registradoPor)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => abrirEditar(examen)}
                      className="rounded text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Editar
                    </button>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => setExamenAEliminar(examen)}
                      disabled={eliminarMutation.isPending}
                      className="rounded text-[13px] font-semibold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-foreground">
                {examen.resultados}
              </p>
              {examen.interpretacion && (
                <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                  {examen.interpretacion}
                </p>
              )}
              {examen.tieneArchivo && (
                <button
                  type="button"
                  onClick={() => abrirAdjunto(examen)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {examen.archivoNombre || 'Ver adjunto'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ExamenFormModal
        open={modalOpen}
        examen={examenEnEdicion}
        mascotaId={mascotaId}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(examenAEliminar)}
        onOpenChange={(open) => { if (!open) setExamenAEliminar(null) }}
        title="Eliminar examen"
        description={`¿Eliminar el examen "${examenAEliminar?.tipo ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={eliminarMutation.isPending}
        onConfirm={() => {
          eliminarMutation.mutate(examenAEliminar.id)
          setExamenAEliminar(null)
        }}
      />
    </div>
  )
}
