import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FlaskConical, Paperclip, Plus, X } from 'lucide-react'
import { examenesLaboratorioApi } from '@/features/examenesLaboratorio/examenesLaboratorioApi'
import { cn } from '@/lib/utils'

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
      queryClient.invalidateQueries({ queryKey: ['examenes-laboratorio', mascotaId] })
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
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-foreground">
            {examen ? 'Editar examen de laboratorio' : 'Registrar examen de laboratorio'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-1">
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setForm((c) => ({ ...c, tipo: e.target.value }))}
              placeholder="Tipo de examen"
              className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
            />
            <div className="flex flex-wrap gap-1">
              {TIPOS_EXAMEN_SUGERIDOS.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, tipo }))}
                  className={cn(
                    'border px-1.5 py-0.5 text-[10px] font-semibold transition',
                    form.tipo === tipo
                      ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                      : 'border-border bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Fecha del examen</p>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((c) => ({ ...c, fecha: e.target.value }))}
                className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Laboratorio (opcional)</p>
              <input
                type="text"
                value={form.laboratorio}
                onChange={(e) => setForm((c) => ({ ...c, laboratorio: e.target.value }))}
                placeholder="Laboratorio externo"
                className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
              />
            </div>
          </div>

          <textarea
            value={form.resultados}
            onChange={(e) => setForm((c) => ({ ...c, resultados: e.target.value }))}
            placeholder="Resultados del examen"
            className="min-h-[100px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
          />
          <textarea
            value={form.interpretacion}
            onChange={(e) => setForm((c) => ({ ...c, interpretacion: e.target.value }))}
            placeholder="Interpretación clínica (opcional)"
            className="min-h-[70px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
          />

          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              Adjunto (PDF o imagen, máx. 8 MB) — opcional
            </p>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="w-full border border-border bg-card px-3 py-2 text-sm text-foreground file:mr-3 file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-semibold"
            />
            {examen?.archivoNombre && !archivo && (
              <p className="mt-1 text-xs text-muted-foreground">
                Adjunto actual: {examen.archivoNombre} (se conserva si no seleccionas otro)
              </p>
            )}
          </div>

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardarMutation.isPending}
            className="border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardarMutation.isPending ? 'Guardando...' : examen ? 'Guardar cambios' : 'Registrar examen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted/80"
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
      queryClient.invalidateQueries({ queryKey: ['examenes-laboratorio', mascotaId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible eliminar el examen.'))
    },
  })

  const examenes = examenesQuery.data?.examenes || []

  const abrirCrear = () => { setExamenEnEdicion(null); setModalOpen(true) }
  const abrirEditar = (examen) => { setExamenEnEdicion(examen); setModalOpen(true) }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Exámenes de laboratorio
        </p>
        {puedeEditar && (
          <button
            type="button"
            onClick={abrirCrear}
            className="inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> Registrar examen
          </button>
        )}
      </div>

      {examenesQuery.isPending ? (
        <p className="text-xs text-muted-foreground">Cargando exámenes...</p>
      ) : examenesQuery.isError ? (
        <p className="text-xs text-rose-600">No fue posible cargar los exámenes.</p>
      ) : examenes.length === 0 ? (
        <div className="border border-dashed border-border bg-muted/40 px-4 py-4 text-center">
          <FlaskConical className="mx-auto mb-1 h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Sin exámenes de laboratorio registrados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {examenes.map((examen) => (
            <div key={examen.id} className="border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{examen.tipo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFecha(examen.fecha)}
                    {examen.laboratorio ? ` · ${examen.laboratorio}` : ''}
                    {examen.registradoPor?.nombre ? ` · ${examen.registradoPor.nombre}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => abrirEditar(examen)}
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Editar
                    </button>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el examen "${examen.tipo}"? Esta acción no se puede deshacer.`)) {
                          eliminarMutation.mutate(examen.id)
                        }
                      }}
                      disabled={eliminarMutation.isPending}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs text-foreground">
                {examen.resultados}
              </p>
              {examen.interpretacion && (
                <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                  {examen.interpretacion}
                </p>
              )}
              {examen.archivoUrlPublica && (
                <a
                  href={examen.archivoUrlPublica}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  <Paperclip className="h-3 w-3" />
                  {examen.archivoNombre || 'Ver adjunto'}
                </a>
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
    </div>
  )
}
