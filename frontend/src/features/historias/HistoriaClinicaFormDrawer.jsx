import { useDeferredValue, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Activity, CalendarCheck, ChevronDown, ClipboardCheck, FileText, FlaskConical,
  HeartPulse, Link2, MessageSquare, Pill, Plus, Printer, Search, Syringe, X,
} from 'lucide-react'
import { historiasApi } from '@/features/historias/historiasApi'
import { HYDRATION_OPTIONS, MEDICATION_ROUTE_OPTIONS } from '@/features/historias/historiaConstants'
import { useImprimirFormula, useImprimirHistoria } from '@/features/historias/useImprimirFormula'
import { agendaApi } from '@/features/agenda/agendaApi'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { inventarioClinicoApi } from '@/features/inventarioClinico/inventarioClinicoApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn, formatearEdad } from '@/lib/utils'
import { invalidarDominios } from '@/lib/queryKeys'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import ExamenesLaboratorioSection from '@/features/examenesLaboratorio/ExamenesLaboratorioSection'
import { AntecedentesConsulta, ConsultaAnterior, SignosVitales } from '@/features/historias/ConsultaPartes'
import { medicionesDe, soloDia } from '@/features/pacientes/fichaSaludUtils'
import { Select } from '@/components/ui/select'
import { etiquetaEspecie } from '@/lib/especies'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

// ─── Constantes ──────────────────────────────────────────────────────────────

const MEDICATION_FREQUENCY_SUGGESTIONS = [
  'Cada 8 horas', 'Cada 12 horas', 'Cada 24 horas', 'Dosis única', 'Según necesidad',
]

const MEDICATION_DURATION_SUGGESTIONS = ['3 días', '5 días', '7 días', '10 días', '14 días']

const PROGRESS_STEPS = [
  { id: 'contexto', label: 'Contexto' },
  { id: 'anamnesis', label: 'Anamnesis' },
  { id: 'examen', label: 'Examen' },
  { id: 'diagnostico', label: 'Dx / Tto' },
  { id: 'plan', label: 'Plan' },
]

// Al abrir, solo las secciones obligatorias vienen desplegadas.
const SECCIONES_REQUERIDAS = ['contexto', 'anamnesis', 'diagnostico']

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

const BOTON_BASE =
  'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold outline-none transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
const BOTON_PRIMARIO = `${BOTON_BASE} bg-primary text-primary-foreground hover:brightness-110`
const BOTON_SECUNDARIO = `${BOTON_BASE} bg-secondary text-secondary-foreground hover:brightness-95`

// ─── Bombillo de sección completa ─────────────────────────────────────────────

// Vidrio con reflejo blanco: encendido brilla en verde, apagado queda gris.
// Esfera de cristal: reflejo nítido arriba, luz rebotada abajo y un borde fino
// de luz. Encendida, el centro claro y un halo leve la hacen ver prendida.
const BOMBILLO_ENCENDIDO = {
  background: [
    'radial-gradient(ellipse 45% 32% at 38% 24%, hsl(0 0% 100% / 0.98) 0 45%, hsl(0 0% 100% / 0) 100%)',
    'radial-gradient(ellipse 50% 25% at 50% 88%, hsl(140 100% 90% / 0.7) 0 30%, hsl(0 0% 100% / 0) 100%)',
    'radial-gradient(circle at 50% 55%, hsl(148 85% 68% / 0.95) 0%, hsl(152 70% 46% / 0.9) 55%, hsl(var(--success) / 0.95) 100%)',
  ].join(', '),
  boxShadow:
    'inset 0 0 0 1px hsl(0 0% 100% / 0.45), inset 0 -1px 1px hsl(0 0% 0% / 0.15), 0 0 4px 1px hsl(150 75% 55% / 0.45)',
}
const BOMBILLO_APAGADO = {
  background: [
    'radial-gradient(ellipse 45% 32% at 38% 24%, hsl(0 0% 100% / 0.9) 0 45%, hsl(0 0% 100% / 0) 100%)',
    'radial-gradient(ellipse 50% 25% at 50% 88%, hsl(0 0% 100% / 0.45) 0 30%, hsl(0 0% 100% / 0) 100%)',
    'radial-gradient(circle at 50% 55%, hsl(var(--muted-foreground) / 0.18) 0%, hsl(var(--muted-foreground) / 0.38) 100%)',
  ].join(', '),
  boxShadow: 'inset 0 0 0 1px hsl(0 0% 100% / 0.4), inset 0 -1px 1px hsl(0 0% 0% / 0.1)',
}

function Bombillo({ encendido, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 rounded-full transition-all duration-300', className)}
      style={encendido ? BOMBILLO_ENCENDIDO : BOMBILLO_APAGADO}
    />
  )
}

// ─── FormSection (acordeón) ───────────────────────────────────────────────────

function FormSection({ icon, title, filled, required, open, onToggle, children }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="flex cursor-pointer select-none items-center gap-3 rounded-2xl px-5 py-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 text-base font-semibold tracking-[-0.01em] text-foreground">{title}</span>
        {required && (
          <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">Requerido</span>
        )}
        <Bombillo encendido={filled} className="h-2.5 w-2.5" />
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </div>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 200ms ease' }}>
        <div className="overflow-hidden">
          <div className="grid gap-3 px-5 pb-5 pt-1">{children}</div>
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
  const queryClient = useQueryClient()
  const puedeEditarHistorias = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  // Todos los planes incluyen inventario.
  const puedeConsultarInventarioClinico = true

  // ── Estado interno ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => createDefaultForm(citaIdInicial))
  // Lo último cargado o guardado: si el form difiere, cerrar pide confirmación.
  const [formBase, setFormBase] = useState(form)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [formSections, setFormSections] = useState(new Set(SECCIONES_REQUERIDAS))
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
      const base = mapHistoriaToForm(historiaToEdit)
      setForm(base)
      setFormBase(base)
      setLocalHistoria(historiaToEdit)
      setFormSections(new Set(SECCIONES_REQUERIDAS))
    } else {
      const base = createDefaultForm(citaIdInicial)
      setForm(base)
      setFormBase(base)
      setLocalHistoria(null)
      setFormSections(new Set(SECCIONES_REQUERIDAS))
      setMedicationSearch('')
      setInsumoSearch('')
      setAntecedentesOpen(false)
    }
  }, [open, historiaToEdit, citaIdInicial])

  const hayCambios = JSON.stringify(form) !== JSON.stringify(formBase)
  const solicitarCierre = () => {
    if (hayCambios) setConfirmarCierre(true)
    else onClose()
  }

  // Cerrar con Escape (con el diálogo de confirmación abierto, Escape lo cierra a él)
  useEffect(() => {
    if (!open || confirmarCierre) return
    const handler = (e) => { if (e.key === 'Escape') solicitarCierre() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  })

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

  // Consultas previas: la anterior va en la columna derecha y su peso se
  // compara con el de hoy.
  const historialQuery = useQuery({
    queryKey: ['paciente-historial', mascota?.id || null],
    queryFn: () => historiasApi.obtenerHistoriasMascota(mascota?.id),
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
    queryKey: ['historias-catalogo-insumos-consumo', insumoSearchDeferred],
    queryFn: () => inventarioClinicoApi.obtenerCatalogoConsumo({ buscar: insumoSearchDeferred || undefined, limite: 6 }),
    enabled: open && puedeEditarHistorias && puedeConsultarInventarioClinico,
    placeholderData: (prev) => prev,
  })

  const veterinarios = veterinariosQuery.data?.usuarios || []
  const historiasPrevias = (historialQuery.data?.historias || [])
    .filter((h) => h.id !== historiaToEdit?.id)
    .sort((a, b) => soloDia(b.fechaConsulta || b.createdAt).localeCompare(soloDia(a.fechaConsulta || a.createdAt)))
  const consultaAnterior = historiasPrevias[0] || null
  const pesoAnterior = medicionesDe(historiasPrevias, 'peso').at(-1) || null
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
      toast.success(data?.message || 'Historia clínica registrada exitosamente')
      invalidarDominios(queryClient, 'historias')
      setFormBase(form)
      onSuccess?.(data?.historia || null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar la historia clínica.'))
    },
  })

  const editarHistoriaMutation = useMutation({
    mutationFn: ({ historiaId, payload }) => historiasApi.editarHistoria(historiaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clínica actualizada exitosamente')
      if (data?.historia) setLocalHistoria(data.historia)
      setFormBase(form)
      invalidarDominios(queryClient, 'historias')
      onSuccess?.(data?.historia || null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la historia clínica.'))
    },
  })

  const bloquearHistoriaMutation = useMutation({
    mutationFn: historiasApi.bloquearHistoria,
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clínica bloqueada exitosamente')
      setLocalHistoria((prev) => (prev ? { ...prev, bloqueada: true } : prev))
      // Bloquear descuenta el tratamiento intrahospitalario del inventario clinico.
      invalidarDominios(queryClient, 'historias', 'insumosClinicos')
      onSuccess?.(null)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible bloquear la historia clínica.'))
    },
  })

  // Solo el tratamiento intrahospitalario descuenta al cerrar la historia.
  const hayInsumoSobreStock = form.tratamientoIntrahospitalario.some(excedeStock)

  // ── Formula para el tutor ────────────────────────────────────────────────────
  const imprimirFormula = useImprimirFormula()

  // La formula sale de la version guardada. Esta firma compara el plan en
  // pantalla con el persistido para avisar si hay cambios sin guardar.
  const firmaPlan = (f) =>
    JSON.stringify({
      medicamentos: f.medicamentos
        .filter(medicationHasAnyValue)
        .map((m) =>
          [m.nombre, m.concentracion, m.dosis, m.via, m.frecuencia, m.duracion, m.cantidad, m.indicacion]
            .map((v) => String(v || '').trim())
        ),
      indicaciones: f.indicaciones.trim(),
      proximaConsulta: f.proximaConsulta || '',
    })

  const handleImprimirFormula = () => {
    if (!historiaActual?.id) return
    if (firmaPlan(form) !== firmaPlan(mapHistoriaToForm(historiaActual))) {
      toast.warning('Se imprime la versión guardada. Guarda los cambios del plan farmacológico para incluirlos.')
    }
    imprimirFormula.imprimir(historiaActual.id)
  }

  // ── Historia completa ────────────────────────────────────────────────────────
  const imprimirHistoria = useImprimirHistoria()

  // Mismo criterio que la formula, sobre todo lo que sale impreso.
  const CAMPOS_HISTORIA = [
    'motivoConsulta', 'anamnesis', 'peso', 'temperatura', 'frecuenciaCardiaca',
    'frecuenciaRespiratoria', 'condicionCorporal', 'mucosas', 'estadoHidratacion',
    'examenFisicoDetalle', 'diagnostico', 'diagnosticoPresuntivo', 'tratamiento',
  ]
  const firmaHistoria = (f) =>
    JSON.stringify({
      plan: firmaPlan(f),
      campos: CAMPOS_HISTORIA.map((campo) => String(f[campo] || '').trim()),
      intrahospitalario: f.tratamientoIntrahospitalario.map((t) =>
        [t.insumoClinicoId, t.cantidad, t.via, t.aplicadoEn].map((v) => String(v || '').trim())
      ),
    })

  const handleImprimirHistoria = () => {
    if (!historiaActual?.id) return
    if (firmaHistoria(form) !== firmaHistoria(mapHistoriaToForm(historiaActual))) {
      toast.warning('Se imprime la versión guardada. Guarda los cambios para incluirlos en la historia.')
    }
    imprimirHistoria.imprimir(historiaActual.id)
  }

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
      indicacion: producto.requiereFormula ? 'Dispensar según indicacion médica registrada en la historia.' : '',
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

    // Nombrar solo lo que falta: el aviso con los cuatro campos no decia cual era.
    const faltantes = [
      !payload.veterinarioId && 'profesional responsable',
      !payload.motivoConsulta && 'motivo de consulta',
      !payload.diagnostico && 'diagnóstico principal',
      !payload.tratamiento && 'tratamiento instaurado',
    ].filter(Boolean)
    if (faltantes.length) {
      toast.error(`Falta completar: ${faltantes.join(', ')}.`)
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
  // Completa = las obligatorias tienen lo que exige el guardado; las opcionales, algo escrito.
  const sectionFilled = {
    contexto: !!(form.veterinarioId || preferredVetId),
    anamnesis: !!form.motivoConsulta.trim(),
    examen: !!(form.peso || form.temperatura || form.frecuenciaCardiaca || form.frecuenciaRespiratoria || form.condicionCorporal || form.mucosas || form.estadoHidratacion || form.examenFisicoDetalle),
    diagnostico: !!form.diagnostico.trim() && !!form.tratamiento.trim(),
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
        onClick={solicitarCierre}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={historiaActual ? 'Editar historia clínica' : 'Nueva historia clínica'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-background shadow-2xl transition-transform duration-300 sm:w-[680px] xl:w-[calc(100vw-248px)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="bg-card px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-foreground">
                {mascota ? `${historiaActual ? 'Consulta' : 'Nueva consulta'} de ${mascota.nombre}` : 'Historia clínica'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mascota
                  ? [
                      mascota.raza || etiquetaEspecie(mascota.especie),
                      formatearEdad(mascota.fechaNacimiento),
                      mascota.Propietario?.nombre ? `tutor ${mascota.Propietario.nombre}` : null,
                    ].filter(Boolean).join(' · ')
                  : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!historiaActual && (
                <button
                  type="button"
                  onClick={() => { setForm(createDefaultForm()); setFormSections(new Set(SECCIONES_REQUERIDAS)) }}
                  className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Limpiar
                </button>
              )}
              <button
                type="button"
                onClick={solicitarCierre}
                aria-label="Cerrar"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Indicador de progreso */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {PROGRESS_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setFormSections((prev) => new Set([...prev, step.id]))}
                className="group flex items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={`Ir a ${step.label}`}
              >
                <Bombillo encendido={sectionFilled[step.id]} className="h-2 w-2" />
                <span className="hidden text-[13px] text-muted-foreground transition-colors group-hover:text-foreground sm:inline">
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Banner cita vinculada desde agenda */}
        {citaIdInicial && !historiaActual && (
          <div className="flex items-center gap-2 bg-accent px-5 py-2.5">
            <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <p className="text-[13px] font-semibold text-primary">
              Desde agenda · Cita vinculada automáticamente
            </p>
          </div>
        )}

        {/* Body scrollable */}
        {/* En pantallas grandes cada columna se desplaza por su cuenta y usa todo el alto */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 xl:overflow-hidden">
          <div className="xl:grid xl:h-full xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-4">
          <div className="min-w-0 xl:h-full xl:overflow-y-auto xl:pr-1">
            {/* Antecedentes colapsables */}
            {mascota?.id && (
              <div className="mb-3 overflow-hidden rounded-xl bg-card xl:hidden">
                <button
                  type="button"
                  onClick={() => setAntecedentesOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-3.5 w-3.5 text-danger" />
                    <span className="text-sm font-semibold text-foreground">Antecedentes del paciente</span>
                    {antecedentesQuery.data?.antecedentes?.alergias?.length > 0 && (
                      <span className="inline-flex items-center rounded-md bg-danger-soft px-2 py-0.5 text-[13px] font-semibold text-danger">
                        {antecedentesQuery.data.antecedentes.alergias.length} alerg.
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', antecedentesOpen && 'rotate-180')} />
                </button>
                {antecedentesOpen && (
                  <div className="px-4 pb-4 pt-1">
                    {antecedentesQuery.isPending ? (
                      <p className="text-[13px] text-muted-foreground">Cargando antecedentes...</p>
                    ) : antecedentesQuery.isError ? (
                      <p className="text-[13px] text-danger">No fue posible cargar los antecedentes.</p>
                    ) : (
                      <AntecedentesConsulta antecedentes={antecedentesQuery.data?.antecedentes} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Exámenes de laboratorio colapsables */}
            {mascota?.id && (
              <div className="mb-3 overflow-hidden rounded-xl bg-card xl:hidden">
                <button
                  type="button"
                  onClick={() => setExamenesOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-3.5 w-3.5 text-info" />
                    <span className="text-sm font-semibold text-foreground">Exámenes de laboratorio</span>
                  </div>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', examenesOpen && 'rotate-180')} />
                </button>
                {examenesOpen && (
                  <div className="px-4 pb-4 pt-1">
                    <ExamenesLaboratorioSection
                      mascotaId={mascota.id}
                      puedeEditar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar', 'recepcionista'])}
                      puedeEliminar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])}
                    />
                  </div>
                )}
              </div>
            )}

          {!puedeEditarHistorias ? (
            <div className="rounded-2xl bg-card px-5 py-5 text-[15px] leading-7 text-muted-foreground">
              Tu rol actual puede consultar historias, pero no crear ni modificar consultas clínicas.
            </div>
          ) : (
            <form id="historia-drawer-form" className="space-y-3" onSubmit={handleSubmit}>

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
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-accent px-4 py-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <Link2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-primary">Cita vinculada</p>
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
                      className="flex-shrink-0 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
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
                  className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
                <textarea
                  value={form.anamnesis}
                  onChange={(e) => setForm((c) => ({ ...c, anamnesis: e.target.value }))}
                  placeholder="Anamnesis y relato del tutor"
                  className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </FormSection>

              {/* ── Examen físico ── */}
              <FormSection
                icon={<Activity className="h-4 w-4" />}
                title="Signos vitales y examen físico"
                filled={sectionFilled.examen}
                open={formSections.has('examen')}
                onToggle={() => toggleFormSection('examen')}
              >
                <SignosVitales form={form} setForm={setForm} pesoAnterior={pesoAnterior} />
                <textarea value={form.examenFisicoDetalle} onChange={(e) => setForm((c) => ({ ...c, examenFisicoDetalle: e.target.value }))} placeholder="Hallazgos del examen físico" className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
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
                <textarea value={form.diagnostico} onChange={(e) => setForm((c) => ({ ...c, diagnostico: e.target.value }))} placeholder="Diagnóstico principal (obligatorio)" className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                <textarea value={form.diagnosticoPresuntivo} onChange={(e) => setForm((c) => ({ ...c, diagnosticoPresuntivo: e.target.value }))} placeholder="Diagnóstico presuntivo o diferencial" className="min-h-[70px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                <textarea value={form.tratamiento} onChange={(e) => setForm((c) => ({ ...c, tratamiento: e.target.value }))} placeholder="Tratamiento instaurado (obligatorio)" className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
              </FormSection>

              {/* ── Tratamiento intrahospitalario ── */}
              <FormSection
                icon={<Syringe className="h-4 w-4" />}
                title="Tratamiento intrahospitalario"
                filled={form.tratamientoIntrahospitalario.length > 0}
                open={formSections.has('intrahospitalario')}
                onToggle={() => toggleFormSection('intrahospitalario')}
              >
                <p className="rounded-xl bg-muted px-4 py-3 text-[13px] leading-5 text-muted-foreground">
                  Lo aplicado al paciente dentro de la clínica. Sale del{' '}
                  <strong className="text-foreground">inventario clínico</strong> en unidad base (ml, mg)
                  y se descuenta al <strong className="text-foreground">cerrar la historia</strong>.
                  No se cobra en la factura: su costo queda registrado como{' '}
                  <strong className="text-foreground">gasto de insumos</strong>.
                </p>

                {puedeConsultarInventarioClinico && (
                  <div className="grid gap-2 rounded-xl bg-muted px-3 py-3">
                    <p className="text-[13px] font-semibold text-muted-foreground">Buscar en inventario clínico</p>
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={insumoSearch}
                        onChange={(e) => setInsumoSearch(e.target.value)}
                        placeholder="Insumo, laboratorio o lote"
                        className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {insumosCatalogo.length ? insumosCatalogo.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{i.nombre}</p>
                            <p className="text-[13px] text-muted-foreground">
                              Disponible {formatNumber(i.stock)} {i.unidadBase}
                            </p>
                          </div>
                          <button type="button" onClick={() => addInsumoAlTratamiento(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )) : <p className="text-[13px] text-muted-foreground sm:col-span-2">Sin insumos disponibles en el inventario clínico.</p>}
                    </div>
                  </div>
                )}

                {form.tratamientoIntrahospitalario.length === 0 ? (
                  <p className="rounded-xl bg-muted px-3 py-4 text-center text-[13px] text-muted-foreground">
                    Sin aplicaciones registradas. Busca un insumo arriba para agregarlo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.tratamientoIntrahospitalario.map((item, index) => (
                      <div key={item.id} className="grid gap-2 rounded-xl bg-muted px-3 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-foreground">
                            Aplicación {index + 1}
                            <span className="ml-2 text-success">· {item.nombre}</span>
                          </p>
                          <button type="button" onClick={() => removeTratamientoDraft(item.id)} className="text-[13px] font-semibold text-danger hover:text-danger">Quitar</button>
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
                              className={cn('h-11 rounded-lg border bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring', excedeStock(item) ? 'border-danger' : 'border-input')}
                            />
                            {item.stockDisponible !== null && (
                              <p className={cn('text-[13px] font-medium', excedeStock(item) ? 'text-danger' : 'text-muted-foreground')}>
                                {excedeStock(item)
                                  ? `Solo hay ${formatNumber(item.stockDisponible)} ${item.unidadBase}`
                                  : `Disponible ${formatNumber(item.stockDisponible)} ${item.unidadBase}`}
                              </p>
                            )}
                          </div>
                          <Select
                            variant="field"
                            aria-label="Vía de administración"
                            className="h-11"
                            value={item.via}
                            onValueChange={(value) => updateTratamientoDraft(item.id, 'via', value)}
                            options={MEDICATION_ROUTE_OPTIONS}
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1">
                            <span className="text-[13px] font-semibold text-muted-foreground">Aplicado por</span>
                            <Select
                              variant="field"
                              aria-label="Aplicado por"
                              className="h-11"
                              placeholder="Sin especificar"
                              value={item.responsableId}
                              onValueChange={(value) => updateTratamientoDraft(item.id, 'responsableId', value)}
                              options={veterinarios.map((v) => ({ value: v.id, label: v.nombre }))}
                            />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[13px] font-semibold text-muted-foreground">Fecha y hora</span>
                            <input
                              type="datetime-local"
                              value={item.aplicadoEn}
                              onChange={(e) => updateTratamientoDraft(item.id, 'aplicadoEn', e.target.value)}
                              className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="rounded-xl bg-muted px-4 py-3 text-[13px] leading-5 text-muted-foreground">
                  Lo que el tutor se lleva a casa. Sale del <strong className="text-foreground">inventario de ventas</strong> y
                  se descuenta al facturar, no al cerrar la historia.
                </p>

                {puedeConsultarInventarioClinico && (
                  <div className="grid gap-2 rounded-xl bg-muted px-3 py-3">
                    <p className="text-[13px] font-semibold text-muted-foreground">Buscar en inventario de ventas</p>
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                        placeholder="Medicamento o laboratorio"
                        className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {medicamentosCatalogo.length ? medicamentosCatalogo.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{p.nombre}</p>
                            <p className="text-[13px] text-muted-foreground">Cantidad {formatNumber(p.stock)}</p>
                          </div>
                          <button type="button" onClick={() => addMedicationFromInventory(p)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )) : <p className="text-[13px] text-muted-foreground sm:col-span-2">Sin resultados.</p>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-muted-foreground">Formulación</p>
                  <button type="button" onClick={addMedicationDraft} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring">
                    <Plus className="h-3.5 w-3.5" /> Agregar medicamento
                  </button>
                </div>

                <div className="space-y-2">
                  {form.medicamentos.map((item, index) => (
                    <div key={item.id} className="grid gap-2 rounded-xl bg-muted px-3 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-foreground">
                          Medicamento {index + 1}
                          {item.fuente === 'inventario' && <span className="ml-2 text-info">· inventario</span>}
                        </p>
                        <button type="button" onClick={() => removeMedicationDraft(item.id)} className="text-[13px] font-semibold text-danger hover:text-danger">Quitar</button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input type="text" value={item.nombre} onChange={(e) => updateMedicationDraft(item.id, 'nombre', e.target.value)} placeholder="Medicamento" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                        <input type="text" value={item.concentracion} onChange={(e) => updateMedicationDraft(item.id, 'concentracion', e.target.value)} placeholder="Concentración / presentación" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                        <input type="text" value={item.dosis} onChange={(e) => updateMedicationDraft(item.id, 'dosis', e.target.value)} placeholder="Dosis" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                        <Select
                          variant="field"
                          aria-label="Vía de administración"
                          className="h-11"
                          value={item.via}
                          onValueChange={(value) => updateMedicationDraft(item.id, 'via', value)}
                          options={MEDICATION_ROUTE_OPTIONS}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <input type="text" value={item.frecuencia} onChange={(e) => updateMedicationDraft(item.id, 'frecuencia', e.target.value)} placeholder="Frecuencia" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                          <div className="flex flex-wrap gap-1">
                            {MEDICATION_FREQUENCY_SUGGESTIONS.map((s) => (
                              <button key={s} type="button" onClick={() => updateMedicationDraft(item.id, 'frecuencia', s)} className={cn('rounded-md px-2 py-0.5 text-[13px] font-medium transition', item.frecuencia === s ? 'bg-accent text-primary' : 'bg-card text-muted-foreground hover:text-foreground')}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <input type="text" value={item.duracion} onChange={(e) => updateMedicationDraft(item.id, 'duracion', e.target.value)} placeholder="Duración" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                          <div className="flex flex-wrap gap-1">
                            {MEDICATION_DURATION_SUGGESTIONS.map((s) => (
                              <button key={s} type="button" onClick={() => updateMedicationDraft(item.id, 'duracion', s)} className={cn('rounded-md px-2 py-0.5 text-[13px] font-medium transition', item.duracion === s ? 'bg-accent text-primary' : 'bg-card text-muted-foreground hover:text-foreground')}>{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
                        <input type="number" min="0" step="1" value={item.cantidad} onChange={(e) => updateMedicationDraft(item.id, 'cantidad', e.target.value)} placeholder="Cantidad" className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                        <textarea value={item.indicacion} onChange={(e) => updateMedicationDraft(item.id, 'indicacion', e.target.value)} placeholder="Instrucciones para el tutor" className="min-h-[56px] rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                      </div>
                    </div>
                  ))}
                </div>

                <textarea value={form.indicaciones} onChange={(e) => setForm((c) => ({ ...c, indicaciones: e.target.value }))} placeholder="Indicaciones generales para el tutor" className="min-h-[70px] w-full rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                <div>
                  <p className="mb-1 text-[13px] text-muted-foreground">Próxima consulta / control</p>
                  <input type="date" value={form.proximaConsulta} onChange={(e) => setForm((c) => ({ ...c, proximaConsulta: e.target.value }))} className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
              </FormSection>

              {historiaActual?.bloqueada && (
                <div className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
                  Esta historia ya está bloqueada. Puedes consultarla, pero no volver a editarla.
                </div>
              )}
            </form>
          )}
          </div>

          {/* Columna derecha (pantallas grandes): lo que se consulta mientras se escribe */}
          {mascota?.id ? (
            <aside className="hidden xl:flex xl:h-full xl:flex-col xl:gap-3 xl:overflow-y-auto xl:pb-1">
              <section aria-labelledby="hc-antecedentes" className="flex flex-col gap-3 rounded-2xl bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="hc-antecedentes" className="text-[15px] font-semibold text-foreground">Antecedentes</h3>
                  <a
                    href={`/antecedentes?mascotaId=${mascota.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded text-[13px] font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Ver todo
                  </a>
                </div>
                {antecedentesQuery.isPending ? (
                  <p className="text-[13px] text-muted-foreground">Cargando antecedentes...</p>
                ) : antecedentesQuery.isError ? (
                  <p className="text-[13px] text-danger">No fue posible cargar los antecedentes.</p>
                ) : (
                  <AntecedentesConsulta antecedentes={antecedentesQuery.data?.antecedentes} />
                )}
              </section>

              <ConsultaAnterior historia={consultaAnterior} />

              <section aria-label="Exámenes de laboratorio" className="rounded-2xl bg-card p-5">
                <ExamenesLaboratorioSection
                  mascotaId={mascota.id}
                  puedeEditar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar', 'recepcionista'])}
                  puedeEliminar={hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])}
                />
              </section>
            </aside>
          ) : null}
          </div>
        </div>

        {/* Footer: quien solo consulta historias (auxiliar) igual puede imprimir la formula y la historia */}
        {(puedeEditarHistorias || historiaActual?.id) && (
          <div className="flex flex-wrap gap-2 bg-card px-4 py-3 sm:px-5">
            {puedeEditarHistorias && (
              <button
                type="submit"
                form="historia-drawer-form"
                disabled={isSaving || historiaActual?.bloqueada}
                className={BOTON_PRIMARIO}
              >
                {historiaActual?.id
                  ? isSaving ? 'Guardando...' : 'Guardar cambios'
                  : isSaving ? 'Guardando...' : 'Registrar historia'}
              </button>
            )}
            {puedeEditarHistorias && historiaActual?.id && (
              <button
                type="button"
                onClick={handleBloquearHistoria}
                disabled={bloquearHistoriaMutation.isPending || historiaActual.bloqueada || hayInsumoSobreStock}
                className={BOTON_SECUNDARIO}
              >
                {bloquearHistoriaMutation.isPending ? 'Bloqueando...' : 'Bloquear historia'}
              </button>
            )}
            {puedeEditarHistorias && historiaActual?.id && historiaActual.bloqueada && !historiaActual.facturaId && (
              <button
                type="button"
                onClick={() => navigate('/finanzas', { state: { facturarHistoriaId: historiaActual.id } })}
                className={BOTON_SECUNDARIO}
              >
                Facturar consulta
              </button>
            )}
            {historiaActual?.id && (
              <button
                type="button"
                onClick={handleImprimirFormula}
                disabled={imprimirFormula.isPending}
                title="Imprimir fórmula"
                className={BOTON_SECUNDARIO}
              >
                <Printer className="h-4 w-4" />
                {imprimirFormula.isPending ? 'Generando...' : 'Fórmula'}
              </button>
            )}
            {historiaActual?.id && (
              <button
                type="button"
                onClick={handleImprimirHistoria}
                disabled={imprimirHistoria.isPending}
                title="Imprimir historia"
                className={BOTON_SECUNDARIO}
              >
                <FileText className="h-4 w-4" />
                {imprimirHistoria.isPending ? 'Generando...' : 'Historia'}
              </button>
            )}
            <button type="button" onClick={solicitarCierre} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmarCierre}
        onOpenChange={setConfirmarCierre}
        title="¿Cerrar sin guardar?"
        description="La historia clínica tiene cambios que no se han guardado. Si cierras, se pierden."
        confirmLabel="Cerrar sin guardar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmarCierre(false)
          setForm(formBase)
          onClose()
        }}
      />
    </>,
    document.body
  )
}
