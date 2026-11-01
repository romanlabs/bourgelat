import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { toast } from 'sonner'
import { ChevronRight, FlaskConical, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
import FilaDeslizable from '@/components/movil/FilaDeslizable'
import HojaInferior from '@/components/movil/HojaInferior'
import { useEsCelular } from '@/lib/useEsCelular'
import { examenesLaboratorioApi } from '@/features/examenesLaboratorio/examenesLaboratorioApi'
import { cn } from '@/lib/utils'
import { CLASE_RESALTADO, TRANSICION_RESALTADO, useResaltado } from '@/lib/useResaltado'
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center lg:px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={examen ? 'Editar examen de laboratorio' : 'Registrar examen de laboratorio'}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl lg:max-h-[90dvh] lg:rounded-2xl"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4 lg:px-6 lg:pt-5">
          <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
            {examen ? 'Editar examen de laboratorio' : 'Registrar examen de laboratorio'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 lg:w-10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-3 lg:space-y-4 lg:px-6 lg:py-4">
          <div className="grid gap-1">
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setForm((c) => ({ ...c, tipo: e.target.value }))}
              placeholder="Tipo de examen"
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-sm"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TIPOS_EXAMEN_SUGERIDOS.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, tipo }))}
                  className={cn(
                    'inline-flex h-11 items-center rounded-md px-3 text-[13px] font-semibold transition active:translate-y-px lg:h-auto lg:px-2.5 lg:py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-sm"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] text-muted-foreground">Laboratorio (opcional)</p>
              <input
                type="text"
                value={form.laboratorio}
                onChange={(e) => setForm((c) => ({ ...c, laboratorio: e.target.value }))}
                placeholder="Laboratorio externo"
                className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-sm"
              />
            </div>
          </div>

          <textarea
            value={form.resultados}
            onChange={(e) => setForm((c) => ({ ...c, resultados: e.target.value }))}
            placeholder="Resultados del examen"
            className="min-h-[120px] w-full rounded-lg border border-input bg-card px-3 py-3 text-base lg:min-h-[100px] lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            value={form.interpretacion}
            onChange={(e) => setForm((c) => ({ ...c, interpretacion: e.target.value }))}
            placeholder="Interpretación clínica (opcional)"
            className="min-h-[90px] w-full rounded-lg border border-input bg-card px-3 py-3 text-base lg:min-h-[70px] lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div>
            <p className="mb-1.5 text-[13px] text-muted-foreground">
              Adjunto (PDF o imagen, máx. 8 MB) — opcional
            </p>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground lg:text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2.5 lg:file:py-1.5 file:text-[13px] file:font-semibold file:text-secondary-foreground"
            />
            {examen?.archivoNombre && !archivo && (
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Adjunto actual: {examen.archivoNombre} (se conserva si no seleccionas otro)
              </p>
            )}
          </div>

          <button type="submit" className="hidden" aria-hidden="true" />
        </form>

        <div className="flex gap-2.5 border-t border-border px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 lg:border-0 lg:px-6 lg:pb-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardarMutation.isPending}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-primary px-5 lg:h-11 lg:flex-none lg:justify-starttext-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardarMutation.isPending ? 'Guardando...' : examen ? 'Guardar cambios' : 'Registrar examen'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-11"
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
  const [examenAbierto, setExamenAbierto] = useState(null)
  const esCelular = useEsCelular()

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
  const examenResaltado = useResaltado('examen', {
    presente: (id) => examenes.some((examen) => examen.id === id),
  })

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
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-secondary px-3 text-[13px] lg:h-9 font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {examenes.map((examen) => esCelular ? (
            <div
              key={examen.id}
              data-resaltar-id={examen.id}
              className={cn('rounded-xl', TRANSICION_RESALTADO, examen.id === examenResaltado && CLASE_RESALTADO)}
            >
              <FilaDeslizable
                className="bg-muted"
                acciones={[
                  puedeEditar && { key: 'editar', label: 'Editar', icon: Pencil, tono: 'primary', onClick: () => abrirEditar(examen) },
                  puedeEliminar && { key: 'eliminar', label: 'Eliminar', icon: Trash2, tono: 'danger', onClick: () => setExamenAEliminar(examen) },
                ].filter(Boolean)}
              >
                <button
                  type="button"
                  onClick={() => setExamenAbierto(examen)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-muted px-3.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                    <FlaskConical className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-foreground">{examen.tipo}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {[formatFecha(examen.fecha), examen.laboratorio].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-[13px] text-foreground/80">{examen.resultados}</span>
                  </span>
                  {examen.tieneArchivo && <Paperclip className="h-4 w-4 shrink-0 text-info" aria-label="Con adjunto" />}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </FilaDeslizable>
            </div>
          ) : (
            <div
              key={examen.id}
              data-resaltar-id={examen.id}
              className={cn('rounded-xl bg-muted px-4 py-3.5', TRANSICION_RESALTADO, examen.id === examenResaltado && CLASE_RESALTADO)}
            >
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

      <HojaInferior
        abierta={esCelular && Boolean(examenAbierto)}
        onCambiar={(abierta) => { if (!abierta) setExamenAbierto(null) }}
        titulo={examenAbierto?.tipo || 'Examen'}
        descripcion={examenAbierto ? [formatFecha(examenAbierto.fecha), examenAbierto.laboratorio, examenAbierto.registradoPor?.nombre && nombreAutor(examenAbierto.registradoPor)].filter(Boolean).join(' · ') : undefined}
        pie={examenAbierto && (puedeEditar || puedeEliminar) ? (
          <div className="flex gap-2.5">
            {puedeEditar && (
              <button
                type="button"
                onClick={() => { const e = examenAbierto; setExamenAbierto(null); abrirEditar(e) }}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground active:translate-y-px"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
            )}
            {puedeEliminar && (
              <button
                type="button"
                onClick={() => { const e = examenAbierto; setExamenAbierto(null); setExamenAEliminar(e) }}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-danger-soft text-sm font-semibold text-danger active:translate-y-px"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            )}
          </div>
        ) : undefined}
      >
        {examenAbierto && (
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Resultados</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground">{examenAbierto.resultados}</p>
            </div>
            {examenAbierto.interpretacion && (
              <div className="rounded-xl bg-muted px-3.5 py-3">
                <p className="text-[13px] font-medium text-muted-foreground">Interpretación clínica</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{examenAbierto.interpretacion}</p>
              </div>
            )}
            {examenAbierto.tieneArchivo && (
              <button
                type="button"
                onClick={() => abrirAdjunto(examenAbierto)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground active:translate-y-px"
              >
                <Paperclip className="h-4 w-4" />
                <span className="truncate">{examenAbierto.archivoNombre || 'Ver adjunto'}</span>
              </button>
            )}
          </div>
        )}
      </HojaInferior>

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
