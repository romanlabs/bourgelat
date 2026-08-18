import { useDeferredValue, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Activity, CalendarCheck, ChevronDown, ClipboardCheck, FlaskConical,
  HeartPulse, Link2, MessageSquare, Pill, Plus, Search, Syringe, X,
} from 'lucide-react'
import { historiasApi } from '@/features/historias/historiasApi'
import { agendaApi } from '@/features/agenda/agendaApi'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { inventarioClinicoApi } from '@/features/inventarioClinico/inventarioClinicoApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import AntecedentesResumen from '@/features/pacientes/AntecedentesResumen'
import ExamenesLaboratorioSection from '@/features/examenesLaboratorio/ExamenesLaboratorioSection'
import { Select } from '@/components/ui/select'

// ─── Constantes ──────────────────────────────────────────────────────────────

const HYDRATION_OPTIONS = [
  { value: '', label: 'Estado de hidratacion' },
  { value: 'normal', label: 'Normal' },
  { value: 'deshidratacion_leve', label: 'Deshidratacion leve' },
  { value: 'deshidratacion_moderada', label: 'Deshidratacion moderada' },
  { value: 'deshidratacion_severa', label: 'Deshidratacion severa' },
]

const MEDICATION_ROUTE_OPTIONS = [
  { value: '', label: 'Via de administracion' },
  { value: 'oral', label: 'Oral' },
  { value: 'subcutanea', label: 'Subcutanea' },
  { value: 'intramuscular', label: 'Intramuscular' },
  { value: 'intravenosa', label: 'Intravenosa' },
  { value: 'topica', label: 'Topica' },
  { value: 'otica', label: 'Otica' },
  { value: 'oftalmica', label: 'Oftalmica' },
  { value: 'inhalada', label: 'Inhalada' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'transdermica', label: 'Transdermica' },
  { value: 'otra', label: 'Otra' },
]

const MEDICATION_FREQUENCY_SUGGESTIONS = [
  'Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Dosis unica', 'Segun necesidad',
]

const MEDICATION_DURATION_SUGGESTIONS = ['3 dias', '5 dias', '7 dias', '10 dias', '14 dias']

const PROGRESS_STEPS = [
  { id: 'contexto', label: 'Contexto' },
  { id: 'anamnesis', label: 'Anamnesis' },
  { id: 'examen', label: 'Examen' },
  { id: 'diagnostico', label: 'Dx / Tto' },
  { id: 'plan', label: 'Plan' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const createMedicationId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// Plan farmacologico: lo que el tutor se lleva. Sale del inventario de VENTAS
// y se descuenta al facturar, no al cerrar la historia.
const createMedicationDraft = (overrides = {}) => ({
  id: createMedicationId(),
  productoId: '',
  fuente: '',
  nombre: '',
  concentracion: '',
  dosis: '',
  via: '',
  frecuencia: '',
  duracion: '',
  cantidad: '',
  indicacion: '',
  ...overrides,
})

// Tratamiento intrahospitalario: lo aplicado dentro de la clinica. Sale del
// inventario CLINICO en unidad base y se descuenta al cerrar la historia.
const createTratamientoDraft = (overrides = {}) => ({
  id: createMedicationId(),
  insumoClinicoId: '',
  nombre: '',
  unidadBase: '',
  stockDisponible: null,
  cantidad: '',
  via: '',
  responsableId: '',
  aplicadoEn: '',
  ...overrides,
})

// Valor para <input type="datetime-local">, que no admite zona horaria.
const toDateTimeLocal = (value) => {
  const fecha = value ? new Date(value) : new Date()
  if (Number.isNaN(fecha.getTime())) return ''
  const offset = fecha.getTimezoneOffset() * 60000
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 16)
}

const createDefaultForm = (citaId = '') => ({
  motivoConsulta: '',
  anamnesis: '',
  peso: '',
  temperatura: '',
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  condicionCorporal: '',
  mucosas: '',
  estadoHidratacion: '',
  examenFisicoDetalle: '',
  diagnostico: '',
  diagnosticoPresuntivo: '',
  tratamiento: '',
  medicamentos: [createMedicationDraft()],
  tratamientoIntrahospitalario: [],
  indicaciones: '',
  proximaConsulta: '',
  citaId,
  veterinarioId: '',
})

const normalizeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

// El inventario clinico se descuenta al cerrar la historia, asi que avisamos
// aqui en vez de dejar que el backend responda 400 al intentar bloquear.
const excedeStock = (item) => {
  if (!item?.insumoClinicoId || item.stockDisponible === null || item.stockDisponible === undefined) return false
  const cantidad = Number(item.cantidad)
  return Number.isFinite(cantidad) && cantidad > Number(item.stockDisponible)
}

const medicationHasAnyValue = (item) =>
  [item?.nombre, item?.concentracion, item?.dosis, item?.via, item?.frecuencia, item?.duracion, item?.cantidad, item?.indicacion]
    .some((v) => String(v || '').trim().length > 0)

const mapMedicamentosToDrafts = (medicamentos) => {
  if (!Array.isArray(medicamentos) || medicamentos.length === 0) return [createMedicationDraft()]
  const drafts = medicamentos
    .map((item) => {
      if (typeof item === 'string') return createMedicationDraft({ nombre: item })
      if (item && typeof item === 'object') {
        return createMedicationDraft({
          productoId: item.productoId || '',
          fuente: item.fuente || '',
          nombre: item.nombre || '',
          concentracion: item.concentracion || '',
          dosis: item.dosis || '',
          via: item.via || '',
          frecuencia: item.frecuencia || '',
          duracion: item.duracion || '',
          cantidad: item.cantidad === undefined || item.cantidad === null || item.cantidad === '' ? '' : String(item.cantidad),
          indicacion: item.indicacion || item.instrucciones || '',
        })
      }
      return null
    })
    .filter(Boolean)
  return drafts.length > 0 ? drafts : [createMedicationDraft()]
}

// Sin fila vacia por defecto: la seccion arranca colapsada y solo se llena
// cuando el veterinario elige un insumo del inventario clinico.
const mapTratamientoToDrafts = (lineas) => {
  if (!Array.isArray(lineas)) return []
  return lineas
    .filter((item) => item && typeof item === 'object' && item.insumoClinicoId)
    .map((item) =>
      createTratamientoDraft({
        insumoClinicoId: item.insumoClinicoId,
        nombre: item.nombre || '',
        unidadBase: item.unidadBase || '',
        cantidad: item.cantidad === undefined || item.cantidad === null ? '' : String(item.cantidad),
        via: item.via || '',
        responsableId: item.responsableId || '',
        aplicadoEn: toDateTimeLocal(item.aplicadoEn),
      })
    )
}

const mapHistoriaToForm = (historia) => ({
  motivoConsulta: historia?.motivoConsulta || '',
  anamnesis: historia?.anamnesis || '',
  peso: historia?.peso ? String(historia.peso) : '',
  temperatura: historia?.temperatura ? String(historia.temperatura) : '',
  frecuenciaCardiaca: historia?.frecuenciaCardiaca ? String(historia.frecuenciaCardiaca) : '',
  frecuenciaRespiratoria: historia?.frecuenciaRespiratoria ? String(historia.frecuenciaRespiratoria) : '',
  condicionCorporal: historia?.condicionCorporal ? String(historia.condicionCorporal) : '',
  mucosas: historia?.mucosas || '',
  estadoHidratacion: historia?.estadoHidratacion || '',
  examenFisicoDetalle: historia?.examenFisicoDetalle || '',
  diagnostico: historia?.diagnostico || '',
  diagnosticoPresuntivo: historia?.diagnosticoPresuntivo || '',
  tratamiento: historia?.tratamiento || '',
  medicamentos: mapMedicamentosToDrafts(historia?.medicamentos),
  tratamientoIntrahospitalario: mapTratamientoToDrafts(historia?.tratamientoIntrahospitalario),
  indicaciones: historia?.indicaciones || '',
  proximaConsulta: historia?.proximaConsulta || '',
  citaId: historia?.citaId || '',
  veterinarioId: historia?.veterinarioId || '',
})

// ─── FormSection (acordeón) ───────────────────────────────────────────────────

function FormSection({ icon, title, filled, required, open, onToggle, children }) {
  return (
    <div className="overflow-hidden border border-border">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="flex cursor-pointer select-none items-center gap-2.5 bg-muted/40 px-4 py-3 transition-colors hover:bg-muted/70"
      >
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {required && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">requerido</span>
        )}
        <div className={cn('h-2 w-2 flex-shrink-0 rounded-full transition-colors', filled ? 'bg-primary' : 'bg-muted-foreground/30')} />
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </div>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 200ms ease' }}>
        <div className="overflow-hidden">
          <div className="grid gap-3 border-t border-border/60 px-4 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HistoriaClinicaFormDrawer({
  open,
  onClose,
  mascota,
  citaIdInicial = '',
  historiaToEdit = null,
  onSuccess,
}) {
  const usuario = useAuthStore((s) => s.usuario)
  const navigate = useNavigate()
  const puedeEditarHistorias = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  // Todos los planes incluyen inventario.
  const puedeConsultarInventarioClinico = true

  // ── Estado interno ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => createDefaultForm(citaIdInicial))
  const [formSections, setFormSections] = useState(new Set(['contexto', 'anamnesis']))
  const [medicationSearch, setMedicationSearch] = useState('')
  const [insumoSearch, setInsumoSearch] = useState('')
  const [antecedentesOpen, setAntecedentesOpen] = useState(false)
  const [examenesOpen, setExamenesOpen] = useState(false)
  const [localHistoria, setLocalHistoria] = useState(null)

  const medicationSearchDeferred = useDeferredValue(medicationSearch.trim())
  const insumoSearchDeferred = useDeferredValue(insumoSearch.trim())

  // Historia efectiva (puede actualizarse localmente después de editar/bloquear)
  const historiaActual = localHistoria

  // ── Sincronizar form cuando abre el drawer o cambia la historia a editar ───
  useEffect(() => {
    if (!open) return
    if (historiaToEdit) {
      setForm(mapHistoriaToForm(historiaToEdit))
      setLocalHistoria(historiaToEdit)
      setFormSections(new Set(['contexto', 'anamnesis', 'examen', 'diagnostico', 'plan']))
    } else {
      setForm(createDefaultForm(citaIdInicial))
      setLocalHistoria(null)
      setFormSections(new Set(['contexto', 'anamnesis']))
      setMedicationSearch('')
      setInsumoSearch('')
      setAntecedentesOpen(false)
    }
  }, [open, historiaToEdit, citaIdInicial])

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const toggleFormSection = (id) =>
    setFormSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Queries ─────────────────────────────────────────────────────────────────
  const veterinariosQuery = useQuery({
    queryKey: ['historias-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: open,
    placeholderData: (prev) => prev,
  })

  const citasRelacionadasQuery = useQuery({
    queryKey: ['historias-citas-relacionadas', mascota?.id || null],
    queryFn: () => agendaApi.obtenerCitas({ mascotaId: mascota?.id, pagina: 1, limite: 12 }),
    enabled: open && Boolean(mascota?.id),
    placeholderData: (prev) => prev,
  })

  const antecedentesQuery = useQuery({
    queryKey: ['historias-antecedentes', mascota?.id || null],
    queryFn: () => antecedentesApi.obtenerAntecedentes(mascota?.id),
    enabled: open && Boolean(mascota?.id),
    placeholderData: (prev) => prev,
  })

  // Plan farmacologico -> inventario de ventas (productos enteros).
  const catalogoMedicamentosQuery = useQuery({
    queryKey: ['historias-catalogo-medicamentos', medicationSearchDeferred],
    queryFn: () => inventarioApi.obtenerCatalogoMedicamentos({ buscar: medicationSearchDeferred || undefined, limite: 6 }),
    enabled: open && puedeEditarHistorias && puedeConsultarInventarioClinico,
    placeholderData: (prev) => prev,
  })

  // Tratamiento intrahospitalario -> inventario clinico (unidad base fraccionada).
  const catalogoInsumosQuery = useQuery({
    queryKey: ['historias-catalogo-insumos-dosis', insumoSearchDeferred],
    queryFn: () => inventarioClinicoApi.obtenerCatalogoDosis({ buscar: insumoSearchDeferred || undefined, limite: 6 }),
    enabled: open && puedeEditarHistorias && puedeConsultarInventarioClinico,
    placeholderData: (prev) => prev,
  })

  const veterinarios = veterinariosQuery.data?.usuarios || []
  const citasRelacionadas = citasRelacionadasQuery.data?.citas || []
  const medicamentosCatalogo = catalogoMedicamentosQuery.data?.productos || []
  const insumosCatalogo = catalogoInsumosQuery.data?.insumos || []

  const preferredVetId =
    veterinarios.find((v) => v.id === usuario?.id)?.id || veterinarios[0]?.id || ''

  const citaVinculada = form.citaId
    ? citasRelacionadas.find((c) => c.id === form.citaId) || null
    : null

  // ── Mutations ────────────────────────────────────────────────────────────────
  const crearHistoriaMutation = useMutation({
    mutationFn: historiasApi.crearHistoria,
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica registrada exitosamente')
      onSuccess?.(data?.historia || null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar la historia clinica.'))
    },
  })

  const editarHistoriaMutation = useMutation({
    mutationFn: ({ historiaId, payload }) => historiasApi.editarHistoria(historiaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica actualizada exitosamente')
      if (data?.historia) setLocalHistoria(data.historia)
      onSuccess?.(data?.historia || null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la historia clinica.'))
    },
  })

  const bloquearHistoriaMutation = useMutation({
    mutationFn: historiasApi.bloquearHistoria,
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica bloqueada exitosamente')
      setLocalHistoria((prev) => (prev ? { ...prev, bloqueada: true } : prev))
      onSuccess?.(null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible bloquear la historia clinica.'))
    },
  })

  // Solo el tratamiento intrahospitalario descuenta al cerrar la historia.
  const hayInsumoSobreStock = form.tratamientoIntrahospitalario.some(excedeStock)

  // Bloquear descuenta inventario clinico. Si hay cambios sin guardar, lo que se
  // descuenta es lo ya persistido, no lo que se ve en pantalla.
  const handleBloquearHistoria = () => {
    if (!historiaActual?.id) return

    if (hayInsumoSobreStock) {
      toast.error('Ajusta las cantidades: hay insumos que superan el stock disponible.')
      return
    }

    const sinCantidad = form.tratamientoIntrahospitalario.find(
      (item) => !item.cantidad || Number(item.cantidad) <= 0
    )

    if (sinCantidad) {
      toast.error(`Indica la cantidad aplicada de "${sinCantidad.nombre || 'el insumo'}".`)
      return
    }

    bloquearHistoriaMutation.mutate(historiaActual.id)
  }

  // ── Medicamentos ─────────────────────────────────────────────────────────────
  const updateMedicationDraft = (draftId, field, value) =>
    setForm((c) => ({ ...c, medicamentos: c.medicamentos.map((item) => item.id === draftId ? { ...item, [field]: value } : item) }))

  const addMedicationDraft = () =>
    setForm((c) => ({ ...c, medicamentos: [...c.medicamentos, createMedicationDraft()] }))

  const removeMedicationDraft = (draftId) =>
    setForm((c) => {
      const next = c.medicamentos.filter((item) => item.id !== draftId)
      return { ...c, medicamentos: next.length > 0 ? next : [createMedicationDraft()] }
    })

  const addMedicationFromInventory = (producto) => {
    const draft = createMedicationDraft({
      productoId: producto.id,
      fuente: 'inventario',
      nombre: producto.nombre || '',
      concentracion: producto.presentacionReferencia || '',
      cantidad: '1',
      indicacion: producto.requiereFormula ? 'Dispensar segun indicacion medica registrada en la historia.' : '',
    })
    setForm((c) => {
      const firstEmptyIndex = c.medicamentos.findIndex((item) => !medicationHasAnyValue(item))
      if (firstEmptyIndex >= 0) {
        return { ...c, medicamentos: c.medicamentos.map((item, idx) => idx === firstEmptyIndex ? draft : item) }
      }
      return { ...c, medicamentos: [...c.medicamentos, draft] }
    })
  }

  // ── Tratamiento intrahospitalario ────────────────────────────────────────────
  const updateTratamientoDraft = (draftId, field, value) =>
    setForm((c) => ({
      ...c,
      tratamientoIntrahospitalario: c.tratamientoIntrahospitalario.map((item) =>
        item.id === draftId ? { ...item, [field]: value } : item
      ),
    }))

  const removeTratamientoDraft = (draftId) =>
    setForm((c) => ({
      ...c,
      tratamientoIntrahospitalario: c.tratamientoIntrahospitalario.filter((item) => item.id !== draftId),
    }))

  const addInsumoAlTratamiento = (insumo) => {
    const draft = createTratamientoDraft({
      insumoClinicoId: insumo.id,
      nombre: insumo.nombre || '',
      unidadBase: insumo.unidadBase || '',
      stockDisponible: Number(insumo.stock),
      // Sin cantidad por defecto: la dosis depende del paciente y se descuenta
      // literal del stock, asi que debe escribirla el veterinario.
      cantidad: '',
      responsableId: form.veterinarioId || preferredVetId || '',
      aplicadoEn: toDateTimeLocal(),
    })
    setForm((c) => ({
      ...c,
      tratamientoIntrahospitalario: [...c.tratamientoIntrahospitalario, draft],
    }))
  }

  // ── Payload y submit ─────────────────────────────────────────────────────────
  const buildPayload = () => {
    const medicamentos = form.medicamentos
      .map((item) => ({
        productoId: item.productoId || undefined,
        nombre: item.nombre.trim(),
        concentracion: item.concentracion.trim() || undefined,
        dosis: item.dosis.trim() || undefined,
        via: item.via || undefined,
        frecuencia: item.frecuencia.trim() || undefined,
        duracion: item.duracion.trim() || undefined,
        cantidad: normalizeNumber(item.cantidad),
        indicacion: item.indicacion.trim() || undefined,
      }))
      .filter((item) => item.nombre)

    const tratamientoIntrahospitalario = form.tratamientoIntrahospitalario
      .filter((item) => item.insumoClinicoId && normalizeNumber(item.cantidad) > 0)
      .map((item) => ({
        insumoClinicoId: item.insumoClinicoId,
        nombre: item.nombre.trim() || undefined,
        cantidad: normalizeNumber(item.cantidad),
        unidadBase: item.unidadBase || undefined,
        via: item.via || undefined,
        responsableId: item.responsableId || undefined,
        aplicadoEn: item.aplicadoEn ? new Date(item.aplicadoEn).toISOString() : undefined,
      }))

    return {
      motivoConsulta: form.motivoConsulta.trim(),
      anamnesis: form.anamnesis.trim() || undefined,
      peso: normalizeNumber(form.peso),
      temperatura: normalizeNumber(form.temperatura),
      frecuenciaCardiaca: normalizeNumber(form.frecuenciaCardiaca),
      frecuenciaRespiratoria: normalizeNumber(form.frecuenciaRespiratoria),
      condicionCorporal: normalizeNumber(form.condicionCorporal),
      mucosas: form.mucosas.trim() || undefined,
      estadoHidratacion: form.estadoHidratacion || undefined,
      examenFisicoDetalle: form.examenFisicoDetalle.trim() || undefined,
      diagnostico: form.diagnostico.trim(),
      diagnosticoPresuntivo: form.diagnosticoPresuntivo.trim() || undefined,
      tratamiento: form.tratamiento.trim(),
      medicamentos,
      tratamientoIntrahospitalario,
      indicaciones: form.indicaciones.trim() || undefined,
      proximaConsulta: form.proximaConsulta || undefined,
      citaId: form.citaId || undefined,
      mascotaId: mascota?.id,
      propietarioId: mascota?.Propietario?.id,
      veterinarioId: form.veterinarioId || preferredVetId,
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!mascota?.id || !mascota?.Propietario?.id) {
      toast.error('No se puede guardar sin un paciente y tutor validos.')
      return
    }

    const medicamentoIncompleto = form.medicamentos.find(
      (item) => medicationHasAnyValue(item) && !item.nombre.trim()
    )
    if (medicamentoIncompleto) {
      toast.error('Cada medicamento diligenciado debe tener al menos el nombre del producto.')
      return
    }

    const payload = buildPayload()

    if (!payload.motivoConsulta || !payload.diagnostico || !payload.tratamiento || !payload.veterinarioId) {
      toast.error('Completa motivo de consulta, diagnostico, tratamiento y profesional responsable.')
      setFormSections(new Set(['contexto', 'anamnesis', 'diagnostico']))
      return
    }

    if (historiaActual?.id) {
      editarHistoriaMutation.mutate({ historiaId: historiaActual.id, payload })
    } else {
      crearHistoriaMutation.mutate(payload)
    }
  }

  // ── Estado de secciones rellenas ─────────────────────────────────────────────
  const sectionFilled = {
    contexto: !!form.veterinarioId || !!form.citaId,
    anamnesis: !!form.motivoConsulta.trim() || !!form.anamnesis.trim(),
    examen: !!(form.peso || form.temperatura || form.frecuenciaCardiaca || form.frecuenciaRespiratoria || form.condicionCorporal || form.mucosas || form.estadoHidratacion || form.examenFisicoDetalle),
    diagnostico: !!form.diagnostico.trim() || !!form.diagnosticoPresuntivo.trim() || !!form.tratamiento.trim(),
    plan: !!form.indicaciones.trim() || !!form.proximaConsulta || form.medicamentos.some((m) => medicationHasAnyValue(m) && m.nombre.trim()),
  }

  const isSaving = crearHistoriaMutation.isPending || editarHistoriaMutation.isPending

  // ── Render ───────────────────────────────────────────────────────────────────
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={historiaActual ? 'Editar historia clinica' : 'Nueva historia clinica'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[680px] sm:border-l sm:border-border ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {historiaActual ? 'Editar historia clínica' : 'Nueva historia clínica'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mascota ? `${mascota.nombre} · ${mascota.especie}` : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!historiaActual && (
                <button
                  type="button"
                  onClick={() => { setForm(createDefaultForm()); setFormSections(new Set(['contexto', 'anamnesis'])) }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Indicador de progreso */}
          <div className="mt-3 flex items-center gap-3">
            {PROGRESS_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setFormSections((prev) => new Set([...prev, step.id]))}
                className="group flex items-center gap-1.5"
                title={`Ir a ${step.label}`}
              >
                <div className={cn('h-2 w-2 rounded-full transition-colors', sectionFilled[step.id] ? 'bg-primary' : 'bg-muted-foreground/25')} />
                <span className="hidden text-[10px] text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Banner cita vinculada desde agenda */}
        {citaIdInicial && !historiaActual && (
          <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/10 px-5 py-2">
            <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <p className="text-xs font-semibold text-primary">
              Desde agenda · Cita vinculada automáticamente
            </p>
          </div>
        )}

        {/* Antecedentes colapsables */}
        {mascota?.id && (
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setAntecedentesOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-2 transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="h-3.5 w-3.5 text-rose-600" />
                <span className="text-xs font-semibold text-foreground">Antecedentes del paciente</span>
                {antecedentesQuery.data?.antecedentes?.alergias?.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    {antecedentesQuery.data.antecedentes.alergias.length} alerg.
                  </span>
                )}
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', antecedentesOpen && 'rotate-180')} />
            </button>
            {antecedentesOpen && (
              <div className="border-t border-border/60 px-5 py-3">
                {antecedentesQuery.isPending ? (
                  <p className="text-xs text-muted-foreground">Cargando antecedentes...</p>
                ) : antecedentesQuery.isError ? (
                  <p className="text-xs text-rose-600">No fue posible cargar los antecedentes.</p>
                ) : (
                  <AntecedentesResumen
                    antecedentes={antecedentesQuery.data?.antecedentes}
                    mascotaId={mascota.id}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Exámenes de laboratorio colapsables */}
        {mascota?.id && (
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setExamenesOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-2 transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="h-3.5 w-3.5 text-cyan-600" />
                <span className="text-xs font-semibold text-foreground">Exámenes de laboratorio</span>
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', examenesOpen && 'rotate-180')} />
            </button>
            {examenesOpen && (
              <div className="border-t border-border/60 px-5 py-3">
                <ExamenesLaboratorioSection
                  mascotaId={mascota.id}
                  puedeEditar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar', 'recepcionista'])}
                  puedeEliminar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])}
                />
              </div>
            )}
          </div>
        )}

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!puedeEditarHistorias ? (
            <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
              Tu rol actual puede consultar historias, pero no crear ni modificar consultas clinicas.
            </div>
          ) : (
            <form id="historia-drawer-form" className="space-y-2" onSubmit={handleSubmit}>

              {/* ── Contexto ── */}
              <FormSection
                icon={<CalendarCheck className="h-4 w-4" />}
                title="Contexto"
                filled={sectionFilled.contexto}
                required
                open={formSections.has('contexto')}
                onToggle={() => toggleFormSection('contexto')}
              >
                <Select
                  variant="field"
                  aria-label="Profesional"
                  className="h-11"
                  placeholder="Selecciona el profesional ⭐"
                  value={form.veterinarioId || preferredVetId}
                  onValueChange={(value) => setForm((c) => ({ ...c, veterinarioId: value }))}
                  options={veterinarios.map((v) => ({ value: v.id, label: v.nombre }))}
                />

                {citaVinculada ? (
                  <div className="flex items-start justify-between gap-3 border border-primary/30 bg-primary/8 px-3 py-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <Link2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Cita vinculada</p>
                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                          {citaVinculada.fecha} · {citaVinculada.horaInicio?.slice(0, 5)}
                          {citaVinculada.horaFin ? `–${citaVinculada.horaFin.slice(0, 5)}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {citaVinculada.motivo || citaVinculada.tipoCita}
                          {citaVinculada.veterinario?.nombre ? ` · ${citaVinculada.veterinario.nombre}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, citaId: '' }))}
                      className="flex-shrink-0 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Desvincular
                    </button>
                  </div>
                ) : (
                  <Select
                    variant="field"
                    aria-label="Cita relacionada"
                    className="h-11"
                    placeholder="Sin cita relacionada"
                    value={form.citaId}
                    onValueChange={(value) => setForm((c) => ({ ...c, citaId: value }))}
                    options={citasRelacionadas.map((cita) => ({
                      value: cita.id,
                      label: `${cita.fecha} · ${cita.horaInicio?.slice(0, 5)} · ${cita.motivo}`,
                    }))}
                  />
                )}
              </FormSection>

              {/* ── Anamnesis ── */}
              <FormSection
                icon={<MessageSquare className="h-4 w-4" />}
                title="Anamnesis"
                filled={sectionFilled.anamnesis}
                required
                open={formSections.has('anamnesis')}
                onToggle={() => toggleFormSection('anamnesis')}
              >
                <textarea
                  value={form.motivoConsulta}
                  onChange={(e) => setForm((c) => ({ ...c, motivoConsulta: e.target.value }))}
                  placeholder="Motivo principal de consulta"
                  className="min-h-[80px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                />
                <textarea
                  value={form.anamnesis}
                  onChange={(e) => setForm((c) => ({ ...c, anamnesis: e.target.value }))}
                  placeholder="Anamnesis y relato del tutor"
                  className="min-h-[80px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                />
              </FormSection>

              {/* ── Examen físico ── */}
              <FormSection
                icon={<Activity className="h-4 w-4" />}
                title="Examen físico"
                filled={sectionFilled.examen}
                open={formSections.has('examen')}
                onToggle={() => toggleFormSection('examen')}
              >
                <p className="text-xs text-muted-foreground">FC (lpm) · FR (rpm) · Condición corporal 1–5</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="number" min="0" step="0.1" value={form.peso} onChange={(e) => setForm((c) => ({ ...c, peso: e.target.value }))} placeholder="Peso (kg)" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                  <input type="number" min="30" max="45" step="0.1" value={form.temperatura} onChange={(e) => setForm((c) => ({ ...c, temperatura: e.target.value }))} placeholder="Temp. °C" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                  <input type="number" min="0" value={form.frecuenciaCardiaca} onChange={(e) => setForm((c) => ({ ...c, frecuenciaCardiaca: e.target.value }))} placeholder="FC (lpm)" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                  <input type="number" min="0" value={form.frecuenciaRespiratoria} onChange={(e) => setForm((c) => ({ ...c, frecuenciaRespiratoria: e.target.value }))} placeholder="FR (rpm)" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                  <input type="number" min="1" max="5" value={form.condicionCorporal} onChange={(e) => setForm((c) => ({ ...c, condicionCorporal: e.target.value }))} placeholder="Condición (1-5)" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                  <input type="text" value={form.mucosas} onChange={(e) => setForm((c) => ({ ...c, mucosas: e.target.value }))} placeholder="Mucosas" className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                </div>
                <Select
                  variant="field"
                  aria-label="Estado de hidratación"
                  value={form.estadoHidratacion}
                  onValueChange={(value) => setForm((c) => ({ ...c, estadoHidratacion: value }))}
                  options={HYDRATION_OPTIONS}
                />
                <textarea value={form.examenFisicoDetalle} onChange={(e) => setForm((c) => ({ ...c, examenFisicoDetalle: e.target.value }))} placeholder="Hallazgos y notas del examen físico" className="min-h-[80px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
              </FormSection>

              {/* ── Diagnóstico y tratamiento ── */}
              <FormSection
                icon={<ClipboardCheck className="h-4 w-4" />}
                title="Diagnóstico y tratamiento"
                filled={sectionFilled.diagnostico}
                required
                open={formSections.has('diagnostico')}
                onToggle={() => toggleFormSection('diagnostico')}
              >
                <textarea value={form.diagnostico} onChange={(e) => setForm((c) => ({ ...c, diagnostico: e.target.value }))} placeholder="Diagnóstico principal" className="min-h-[80px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                <textarea value={form.diagnosticoPresuntivo} onChange={(e) => setForm((c) => ({ ...c, diagnosticoPresuntivo: e.target.value }))} placeholder="Diagnóstico presuntivo o diferencial" className="min-h-[70px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                <textarea value={form.tratamiento} onChange={(e) => setForm((c) => ({ ...c, tratamiento: e.target.value }))} placeholder="Tratamiento instaurado" className="min-h-[80px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
              </FormSection>

              {/* ── Tratamiento intrahospitalario ── */}
              <FormSection
                icon={<Syringe className="h-4 w-4" />}
                title="Tratamiento intrahospitalario"
                filled={form.tratamientoIntrahospitalario.length > 0}
                open={formSections.has('intrahospitalario')}
                onToggle={() => toggleFormSection('intrahospitalario')}
              >
                <p className="border-l-2 border-emerald-500 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Lo aplicado al paciente dentro de la clínica. Sale del{' '}
                  <strong className="text-foreground">inventario clínico</strong> en unidad base (ml, mg)
                  y se descuenta al <strong className="text-foreground">cerrar la historia</strong>.
                </p>

                {puedeConsultarInventarioClinico && (
                  <div className="grid gap-2 border border-dashed border-border bg-muted/50 px-3 py-3">
                    <p className="text-xs font-semibold text-muted-foreground">Buscar en inventario clínico</p>
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={insumoSearch}
                        onChange={(e) => setInsumoSearch(e.target.value)}
                        placeholder="Insumo, laboratorio o lote"
                        className="h-9 w-full border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-emerald-500"
                      />
                    </label>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {insumosCatalogo.length ? insumosCatalogo.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 border border-border bg-card px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{i.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              Disponible {formatNumber(i.stock)} {i.unidadBase}
                            </p>
                          </div>
                          <button type="button" onClick={() => addInsumoAlTratamiento(i)} className="shrink-0 border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/70">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )) : <p className="text-xs text-muted-foreground sm:col-span-2">Sin insumos de dosis disponibles.</p>}
                    </div>
                  </div>
                )}

                {form.tratamientoIntrahospitalario.length === 0 ? (
                  <p className="border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Sin aplicaciones registradas. Busca un insumo arriba para agregarlo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.tratamientoIntrahospitalario.map((item, index) => (
                      <div key={item.id} className="grid gap-2 border border-border bg-card px-3 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">
                            Aplicación {index + 1}
                            <span className="ml-2 text-emerald-700">· {item.nombre}</span>
                          </p>
                          <button type="button" onClick={() => removeTratamientoDraft(item.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-800">Quitar</button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cantidad}
                              onChange={(e) => updateTratamientoDraft(item.id, 'cantidad', e.target.value)}
                              placeholder={item.unidadBase ? `Cantidad aplicada (${item.unidadBase})` : 'Cantidad aplicada'}
                              className={cn('h-9 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-emerald-500', excedeStock(item) ? 'border-rose-400' : 'border-border')}
                            />
                            {item.stockDisponible !== null && (
                              <p className={cn('text-[10px] font-semibold', excedeStock(item) ? 'text-rose-700' : 'text-muted-foreground')}>
                                {excedeStock(item)
                                  ? `Solo hay ${formatNumber(item.stockDisponible)} ${item.unidadBase}`
                                  : `Disponible ${formatNumber(item.stockDisponible)} ${item.unidadBase}`}
                              </p>
                            )}
                          </div>
                          <Select
                            variant="field"
                            aria-label="Vía de administración"
                            className="h-9"
                            value={item.via}
                            onValueChange={(value) => updateTratamientoDraft(item.id, 'via', value)}
                            options={MEDICATION_ROUTE_OPTIONS}
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aplicado por</span>
                            <Select
                              variant="field"
                              aria-label="Aplicado por"
                              className="h-9"
                              placeholder="Sin especificar"
                              value={item.responsableId}
                              onValueChange={(value) => updateTratamientoDraft(item.id, 'responsableId', value)}
                              options={veterinarios.map((v) => ({ value: v.id, label: v.nombre }))}
                            />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha y hora</span>
                            <input
                              type="datetime-local"
                              value={item.aplicadoEn}
                              onChange={(e) => updateTratamientoDraft(item.id, 'aplicadoEn', e.target.value)}
                              className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* ── Plan farmacológico y cierre ── */}
              <FormSection
                icon={<Pill className="h-4 w-4" />}
                title="Plan farmacológico y cierre"
                filled={sectionFilled.plan}
                open={formSections.has('plan')}
                onToggle={() => toggleFormSection('plan')}
              >
                <p className="border-l-2 border-cyan-500 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Lo que el tutor se lleva a casa. Sale del <strong className="text-foreground">inventario de ventas</strong> y
                  se descuenta al facturar, no al cerrar la historia.
                </p>

                {puedeConsultarInventarioClinico && (
                  <div className="grid gap-2 border border-dashed border-border bg-muted/50 px-3 py-3">
                    <p className="text-xs font-semibold text-muted-foreground">Buscar en inventario de ventas</p>
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                        placeholder="Medicamento o laboratorio"
                        className="h-9 w-full border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-cyan-500"
                      />
                    </label>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {medicamentosCatalogo.length ? medicamentosCatalogo.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 border border-border bg-card px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{p.nombre}</p>
                            <p className="text-xs text-muted-foreground">Cantidad {formatNumber(p.stock)}</p>
                          </div>
                          <button type="button" onClick={() => addMedicationFromInventory(p)} className="shrink-0 border border-border bg-muted px-2 py-1 text-xs font-semibold text-foreground transition hover:bg-muted/70">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )) : <p className="text-xs text-muted-foreground sm:col-span-2">Sin resultados.</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formulación</p>
                  <button type="button" onClick={addMedicationDraft} className="inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted">
                    <Plus className="h-3 w-3" /> Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {form.medicamentos.map((item, index) => (
                    <div key={item.id} className="grid gap-2 border border-border bg-card px-3 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">
                          Medicamento {index + 1}
                          {item.fuente === 'inventario' && <span className="ml-2 text-cyan-700">· inventario</span>}
                        </p>
                        <button type="button" onClick={() => removeMedicationDraft(item.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-800">Quitar</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input type="text" value={item.nombre} onChange={(e) => updateMedicationDraft(item.id, 'nombre', e.target.value)} placeholder="Medicamento" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                        <input type="text" value={item.concentracion} onChange={(e) => updateMedicationDraft(item.id, 'concentracion', e.target.value)} placeholder="Concentración / presentación" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                        <input type="text" value={item.dosis} onChange={(e) => updateMedicationDraft(item.id, 'dosis', e.target.value)} placeholder="Dosis" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                        <Select
                          variant="field"
                          aria-label="Vía de administración"
                          className="h-9"
                          value={item.via}
                          onValueChange={(value) => updateMedicationDraft(item.id, 'via', value)}
                          options={MEDICATION_ROUTE_OPTIONS}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <input type="text" value={item.frecuencia} onChange={(e) => updateMedicationDraft(item.id, 'frecuencia', e.target.value)} placeholder="Frecuencia" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                          <div className="flex flex-wrap gap-1">
                            {MEDICATION_FREQUENCY_SUGGESTIONS.map((s) => (
                              <button key={s} type="button" onClick={() => updateMedicationDraft(item.id, 'frecuencia', s)} className={cn('border px-1.5 py-0.5 text-[10px] font-semibold transition', item.frecuencia === s ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-border bg-muted text-muted-foreground hover:text-foreground')}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <input type="text" value={item.duracion} onChange={(e) => updateMedicationDraft(item.id, 'duracion', e.target.value)} placeholder="Duración" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                          <div className="flex flex-wrap gap-1">
                            {MEDICATION_DURATION_SUGGESTIONS.map((s) => (
                              <button key={s} type="button" onClick={() => updateMedicationDraft(item.id, 'duracion', s)} className={cn('border px-1.5 py-0.5 text-[10px] font-semibold transition', item.duracion === s ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-border bg-muted text-muted-foreground hover:text-foreground')}>{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
                        <input type="number" min="0" step="1" value={item.cantidad} onChange={(e) => updateMedicationDraft(item.id, 'cantidad', e.target.value)} placeholder="Cantidad" className="h-9 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                        <textarea value={item.indicacion} onChange={(e) => updateMedicationDraft(item.id, 'indicacion', e.target.value)} placeholder="Instrucciones para el tutor" className="min-h-[56px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                      </div>
                    </div>
                  ))}
                </div>

                <textarea value={form.indicaciones} onChange={(e) => setForm((c) => ({ ...c, indicaciones: e.target.value }))} placeholder="Indicaciones generales para el tutor" className="min-h-[70px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Próxima consulta / control</p>
                  <input type="date" value={form.proximaConsulta} onChange={(e) => setForm((c) => ({ ...c, proximaConsulta: e.target.value }))} className="h-10 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-cyan-500" />
                </div>
              </FormSection>

              {historiaActual?.bloqueada && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  Esta historia ya está bloqueada. Puedes consultarla, pero no volver a editarla.
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {puedeEditarHistorias && (
          <div className="flex flex-wrap gap-3 border-t border-border px-5 py-4">
            <button
              type="submit"
              form="historia-drawer-form"
              disabled={isSaving || historiaActual?.bloqueada}
              className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {historiaActual?.id
                ? isSaving ? 'Guardando...' : 'Guardar cambios'
                : isSaving ? 'Guardando...' : 'Registrar historia'}
            </button>
            {historiaActual?.id && (
              <button
                type="button"
                onClick={handleBloquearHistoria}
                disabled={bloquearHistoriaMutation.isPending || historiaActual.bloqueada || hayInsumoSobreStock}
                className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bloquearHistoriaMutation.isPending ? 'Bloqueando...' : 'Bloquear historia'}
              </button>
            )}
            {historiaActual?.id && historiaActual.bloqueada && !historiaActual.facturaId && (
              <button
                type="button"
                onClick={() => navigate('/finanzas', { state: { facturarHistoriaId: historiaActual.id } })}
                className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Facturar consulta
              </button>
            )}
            <button type="button" onClick={onClose} className="border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/80">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
