import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, ArrowRight, ChevronLeft, Mail, Plus, Search, Sparkles, X } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatLongDate } from '@/features/dashboard/dashboardUtils'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { fechaCorta, soloDia } from '@/features/pacientes/fichaSaludUtils'
import VidaEnLaClinica from '@/features/antecedentes/VidaEnLaClinica'
import { urlGmailRecordatorio } from '@/features/pacientes/recordatorioVacuna'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { etiquetaEspecie } from '@/lib/especies'
import { hoyLocal } from '@/lib/fecha'


const DEFAULT_GENERAL_VALUES = {
  esterilizado: false,
  fechaEsterilizacion: '',
  observacionesGenerales: '',
  medicamentosActualesTexto: '',
}

const DEFAULT_ALERGIA_FORM = {
  tipo: '',
  descripcion: '',
  reaccion: '',
  fecha: hoyLocal(),
}

const DEFAULT_CIRUGIA_FORM = {
  nombre: '',
  fecha: '',
  veterinario: '',
  observaciones: '',
}

const DEFAULT_VACUNA_FORM = {
  nombre: '',
  fecha: '',
  proximaDosis: '',
  lote: '',
  laboratorio: '',
}

const DEFAULT_DESPARASITACION_FORM = {
  tipo: '',
  producto: '',
  fecha: '',
  proximaFecha: '',
}

const DEFAULT_PLANIFICACION_FORM = {
  nombre: '',
  fecha: '',
  proximaFecha: '',
}

const DEFAULT_CONDICION_FORM = {
  nombre: '',
  fechaDiagnostico: '',
  tratamientoActual: '',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.errores?.[0]?.mensaje || fallback

const mapMedicamentosToText = (medicamentos) => {
  if (!Array.isArray(medicamentos) || medicamentos.length === 0) return ''
  return medicamentos
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        return [item.nombre, item.dosis, item.frecuencia].filter(Boolean).join(' | ')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

// Días entre una fecha 'AAAA-MM-DD' y hoy; positivo si ya pasó.
const diasDesde = (fecha) => {
  const [y, m, d] = soloDia(fecha).split('-').map(Number)
  const [hy, hm, hd] = hoyLocal().split('-').map(Number)
  return Math.round((Date.UTC(hy, hm - 1, hd) - Date.UTC(y, m - 1, d)) / 86400000)
}

const buildRows = (items, mapper) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    id: item.id || `${index}`,
    ...mapper(item),
  }))

// ─── Piezas de presentación ──────────────────────────────────────────────────

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const BTN_PRIMARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`
const BTN_SECUNDARIO = `inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`
const CAMPO = 'h-12 w-full rounded-lg border border-input bg-card px-3 text-base lg:h-11 lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'
const CAMPO_AREA = 'min-h-[110px] w-full rounded-lg border border-input bg-card px-3 py-3 text-base lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

function Chip({ className, children }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold', className)}>
      {children}
    </span>
  )
}

function Campo({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

// Tarjeta de una sección clínica: título con conteo y botón para agregar.
function SeccionCard({ id, title, count, actionLabel = 'Agregar', onAction, primaria = false, className, children }) {
  return (
    <section aria-labelledby={id} className={cn('flex flex-col gap-3 rounded-2xl bg-card p-4 sm:p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-baseline gap-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
          {title}
          {typeof count === 'number' ? (
            <span className="text-sm font-medium tabular-nums text-muted-foreground">{count}</span>
          ) : null}
        </h2>
        {onAction ? (
          <button type="button" onClick={onAction} className={primaria ? BTN_PRIMARIO : BTN_SECUNDARIO}>
            {actionLabel === 'Agregar' ? <Plus className="h-4 w-4" /> : null}
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

// Enlace que abre Gmail con el recordatorio listo para el tutor. Solo aparece
// si la dosis ya venció o vence en los próximos 30 días.
function BotonRecordar({ item, tutor, mascotaNombre, clinica, bloque = false }) {
  if (!item.proximaRaw || diasDesde(item.proximaRaw) < -30 || !tutor) return null
  if (!tutor.email) {
    return (
      <span className={cn('text-[13px] text-muted-foreground', bloque && 'mt-1 block')}>
        El tutor no tiene correo
      </span>
    )
  }
  return (
    <a
      href={urlGmailRecordatorio({
        tutorEmail: tutor.email,
        tutorNombre: tutor.nombre,
        mascotaNombre,
        tratamiento: item.tratamiento,
        proxima: item.proximaRaw,
        clinica,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-primary hover:underline',
        bloque && 'mt-1.5 flex w-fit',
        FOCO
      )}
    >
      <Mail className="h-3.5 w-3.5" />
      Recordar al tutor
    </a>
  )
}

function Vacio({ children }) {
  return <p className="rounded-xl bg-muted px-4 py-3.5 text-sm text-muted-foreground">{children}</p>
}

function Item({ titulo, detalle, extra, className, chip }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-xl px-3 py-3', className)}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{titulo}</span>
        {detalle ? <span className="text-sm opacity-80">{detalle}</span> : null}
        {extra ? <span className="text-[13px] opacity-75">{extra}</span> : null}
      </span>
      {chip}
    </div>
  )
}

function RestrictedAntecedentesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="rounded-2xl bg-card p-6">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Antecedentes</h1>
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            Tu acceso actual no permite ver los antecedentes clínicos del paciente. Esta sección es para
            veterinarios, auxiliares y administración.
          </p>
        </section>
      </div>
    </div>
  )
}

export default function AntecedentesPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefillAppliedRef = useRef(false)
  const mascotaIdPrefill = searchParams.get('mascotaId') || ''

  const [antDrawerOpen, setAntDrawerOpen] = useState(false)
  const [antDrawerType, setAntDrawerType] = useState(null) // 'alergia'|'vacuna'|'desparasitacion'|'planificacion'|'cirugia'|'condicion'|'generales'
  const [petSearch, setPetSearch] = useState('')
  const [selectedPet, setSelectedPet] = useState(null)
  const [generalDraft, setGeneralDraft] = useState(null)
  const [alergiaForm, setAlergiaForm] = useState(DEFAULT_ALERGIA_FORM)
  const [cirugiaForm, setCirugiaForm] = useState(DEFAULT_CIRUGIA_FORM)
  const [vacunaForm, setVacunaForm] = useState(DEFAULT_VACUNA_FORM)
  const [desparasitacionForm, setDesparasitacionForm] = useState(DEFAULT_DESPARASITACION_FORM)
  const [planificacionForm, setPlanificacionForm] = useState(DEFAULT_PLANIFICACION_FORM)
  const [condicionForm, setCondicionForm] = useState(DEFAULT_CONDICION_FORM)

  const rolPermitido = canAccessModule(usuario, 'antecedentes')
  const puedeEditar = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  // Todos los planes incluyen antecedentes.
  const puedeVerAntecedentes = true

  useEffect(() => {
    document.title = 'Antecedentes | Bourgelat'
  }, [])

  useEffect(() => {
    if (!antDrawerOpen) return
    const handler = (e) => { if (e.key === 'Escape') setAntDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [antDrawerOpen])

  const openAntDrawer = (type) => {
    setAntDrawerType(type)
    setAntDrawerOpen(true)
  }

  useEffect(() => {
    if (!rolPermitido || !puedeVerAntecedentes || !mascotaIdPrefill || prefillAppliedRef.current) {
      return
    }

    let cancelled = false

    const hydrateFromQuery = async () => {
      try {
        const data = await pacientesApi.obtenerMascota(mascotaIdPrefill)
        if (cancelled) return

        const mascota = data?.mascota
        if (!mascota) {
          return
        }

        prefillAppliedRef.current = true
        setSelectedPet({
          ...mascota,
          Propietario: mascota.Propietario,
        })
        setGeneralDraft(null)
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, 'No fue posible precargar el paciente para antecedentes.'))
        }
      }
    }

    hydrateFromQuery()

    return () => {
      cancelled = true
    }
  }, [rolPermitido, puedeVerAntecedentes, mascotaIdPrefill])

  const mascotasQuery = useQuery({
    queryKey: ['antecedentes-mascotas-selector', petSearch.trim()],
    queryFn: () =>
      pacientesApi.obtenerMascotas({
        buscar: petSearch.trim() || undefined,
        pagina: 1,
        limite: 8,
      }),
    enabled: rolPermitido && puedeVerAntecedentes,
    placeholderData: (previousData) => previousData,
  })

  const antecedentesQuery = useQuery({
    queryKey: ['antecedentes-detalle', selectedPet?.id || null],
    queryFn: () => antecedentesApi.obtenerAntecedentes(selectedPet.id),
    enabled: rolPermitido && puedeVerAntecedentes && Boolean(selectedPet?.id),
    placeholderData: (previousData) => previousData,
  })

  const selectedAntecedentes = antecedentesQuery.data?.antecedentes

  // El paciente elegido de la lista no trae el correo del tutor; el perfil sí.
  const perfilQuery = useQuery({
    queryKey: ['paciente-perfil', selectedPet?.id || null],
    queryFn: () => pacientesApi.obtenerMascota(selectedPet.id),
    enabled: rolPermitido && puedeVerAntecedentes && Boolean(selectedPet?.id),
  })
  const tutor = perfilQuery.data?.mascota?.Propietario || null

  const historiasQuery = useQuery({
    queryKey: ['paciente-historial', selectedPet?.id || null],
    queryFn: () => historiasApi.obtenerHistoriasMascota(selectedPet.id),
    enabled: rolPermitido && puedeVerAntecedentes && Boolean(selectedPet?.id),
  })

  const generalValues = useMemo(() => {
    if (generalDraft) return generalDraft

    return {
      esterilizado: selectedAntecedentes?.esterilizado || false,
      fechaEsterilizacion: selectedAntecedentes?.fechaEsterilizacion || '',
      observacionesGenerales: selectedAntecedentes?.observacionesGenerales || '',
      medicamentosActualesTexto: mapMedicamentosToText(selectedAntecedentes?.medicamentosActuales),
    }
  }, [generalDraft, selectedAntecedentes])

  const actualizarGeneralesMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.actualizarGenerales(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Antecedentes generales actualizados exitosamente')
      setGeneralDraft(null)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar los antecedentes generales.'))
    },
  })

  const agregarAlergiaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarAlergia(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Alergia agregada exitosamente')
      setAlergiaForm(DEFAULT_ALERGIA_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la alergia.'))
    },
  })

  const agregarCirugiaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarCirugia(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Cirugía agregada exitosamente')
      setCirugiaForm(DEFAULT_CIRUGIA_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la cirugía.'))
    },
  })

  const agregarVacunaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarVacuna(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Vacuna agregada exitosamente')
      setVacunaForm(DEFAULT_VACUNA_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la vacuna.'))
    },
  })

  const agregarDesparasitacionMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarDesparasitacion(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Desparasitación agregada exitosamente')
      setDesparasitacionForm(DEFAULT_DESPARASITACION_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la desparasitación.'))
    },
  })

  const agregarPlanificacionMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarPlanificacion(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Planificación agregada exitosamente')
      setPlanificacionForm(DEFAULT_PLANIFICACION_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la planificación.'))
    },
  })

  const agregarCondicionMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarCondicion(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Condición cronica agregada exitosamente')
      setCondicionForm(DEFAULT_CONDICION_FORM)
      setAntDrawerOpen(false)
      invalidarDominios(queryClient, 'historias')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la condición cronica.'))
    },
  })

  const mascotas = mascotasQuery.data?.mascotas || []
  const alergiasRows = buildRows(selectedAntecedentes?.alergias, (item) => ({
    tipo: item.tipo || 'Sin tipo',
    descripcion: item.descripcion || 'Sin descripción',
    reaccion: item.reaccion || 'Sin reacción',
    fecha: item.fecha ? formatLongDate(item.fecha) : 'Sin fecha',
  }))
  const cirugiasRows = buildRows(selectedAntecedentes?.cirugias, (item) => ({
    nombre: item.nombre || 'Sin nombre',
    fecha: item.fecha ? formatLongDate(item.fecha) : 'Sin fecha',
    veterinario: item.veterinario || 'Sin profesional',
    observaciones: item.observaciones || 'Sin observaciones',
  }))
  const vacunasRows = buildRows(selectedAntecedentes?.vacunas, (item) => ({
    nombre: item.nombre || 'Sin nombre',
    fecha: item.fecha ? fechaCorta(item.fecha) : '—',
    proximaDosis: item.proximaDosis ? fechaCorta(item.proximaDosis) : null,
    lote: item.lote || '—',
    laboratorio: item.laboratorio || '—',
    diasVencida: item.proximaDosis ? diasDesde(item.proximaDosis) : 0,
    tratamiento: item.nombre ? `Vacuna ${item.nombre}` : 'Vacuna',
    proximaRaw: item.proximaDosis || null,
  }))
  const desparasitacionesRows = buildRows(selectedAntecedentes?.desparasitaciones, (item) => ({
    tipo: item.tipo || 'Sin tipo',
    producto: item.producto || 'Sin producto',
    fecha: item.fecha ? formatLongDate(item.fecha) : 'Sin fecha',
    proximaFecha: item.proximaFecha ? formatLongDate(item.proximaFecha) : 'Sin fecha programada',
    vencida: Boolean(item.proximaFecha) && String(item.proximaFecha).slice(0, 10) < hoyLocal(),
    tratamiento: item.tipo ? `Desparasitación ${String(item.tipo).toLowerCase()}` : 'Desparasitación',
    proximaRaw: item.proximaFecha || null,
  }))
  const planificacionesRows = buildRows(selectedAntecedentes?.planificaciones, (item) => ({
    nombre: item.nombre || 'Sin nombre',
    fecha: item.fecha ? formatLongDate(item.fecha) : 'Sin fecha',
    proximaFecha: item.proximaFecha ? formatLongDate(item.proximaFecha) : 'Sin fecha programada',
  }))
  const condicionesRows = buildRows(selectedAntecedentes?.condicionesCronicas, (item) => ({
    nombre: item.nombre || 'Sin nombre',
    fechaDiagnostico: item.fechaDiagnostico ? formatLongDate(item.fechaDiagnostico) : 'Sin fecha',
    tratamientoActual: item.tratamientoActual || 'Sin tratamiento actual',
  }))

  const handleSelectPet = (pet) => {
    setSelectedPet(pet)
    setPetSearch('')
    setGeneralDraft(null)
    setAlergiaForm(DEFAULT_ALERGIA_FORM)
    setCirugiaForm(DEFAULT_CIRUGIA_FORM)
    setVacunaForm(DEFAULT_VACUNA_FORM)
    setDesparasitacionForm(DEFAULT_DESPARASITACION_FORM)
    setPlanificacionForm(DEFAULT_PLANIFICACION_FORM)
    setCondicionForm(DEFAULT_CONDICION_FORM)
    if (searchParams.get('mascotaId')) {
      setSearchParams({})
    }
  }

  // Vuelve a la lista para elegir otro paciente.
  const handleVolverALista = () => {
    setSelectedPet(null)
    setPetSearch('')
    setGeneralDraft(null)
    if (searchParams.get('mascotaId')) {
      setSearchParams({})
    }
  }

  const updateGeneralDraft = (field, value) => {
    setGeneralDraft((current) => ({
      ...(current || generalValues),
      [field]: value,
    }))
  }

  const buildMedicamentosPayload = (texto) =>
    texto
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ nombre: line }))

  const requireSelectedPet = () => {
    if (!selectedPet?.id) {
      toast.error('Selecciona primero un paciente activo.')
      return false
    }
    return true
  }

  const handleGuardarGenerales = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return

    actualizarGeneralesMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        esterilizado: generalValues.esterilizado,
        fechaEsterilizacion: generalValues.fechaEsterilizacion || undefined,
        observacionesGenerales: generalValues.observacionesGenerales.trim() || undefined,
        medicamentosActuales: buildMedicamentosPayload(generalValues.medicamentosActualesTexto),
      },
    })
  }

  const handleAgregarAlergia = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!alergiaForm.tipo.trim() || !alergiaForm.descripcion.trim()) {
      toast.error('Completa tipo y descripción de la alergia.')
      return
    }

    agregarAlergiaMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        tipo: alergiaForm.tipo.trim(),
        descripcion: alergiaForm.descripcion.trim(),
        reaccion: alergiaForm.reaccion.trim() || undefined,
        fecha: alergiaForm.fecha || undefined,
      },
    })
  }

  const handleAgregarCirugia = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!cirugiaForm.nombre.trim() || !cirugiaForm.fecha) {
      toast.error('Completa nombre y fecha de la cirugía.')
      return
    }

    agregarCirugiaMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        nombre: cirugiaForm.nombre.trim(),
        fecha: cirugiaForm.fecha,
        veterinario: cirugiaForm.veterinario.trim() || undefined,
        observaciones: cirugiaForm.observaciones.trim() || undefined,
      },
    })
  }

  const handleAgregarVacuna = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!vacunaForm.nombre.trim() || !vacunaForm.fecha) {
      toast.error('Completa nombre y fecha de la vacuna.')
      return
    }

    agregarVacunaMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        nombre: vacunaForm.nombre.trim(),
        fecha: vacunaForm.fecha,
        proximaDosis: vacunaForm.proximaDosis || undefined,
        lote: vacunaForm.lote.trim() || undefined,
        laboratorio: vacunaForm.laboratorio.trim() || undefined,
      },
    })
  }

  const handleAgregarDesparasitacion = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!desparasitacionForm.tipo || !desparasitacionForm.fecha) {
      toast.error('Completa el tipo y la fecha de la desparasitación.')
      return
    }

    agregarDesparasitacionMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        tipo: desparasitacionForm.tipo,
        producto: desparasitacionForm.producto.trim() || undefined,
        fecha: desparasitacionForm.fecha,
        proximaFecha: desparasitacionForm.proximaFecha || undefined,
      },
    })
  }

  const handleAgregarPlanificacion = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!planificacionForm.nombre.trim() || !planificacionForm.fecha) {
      toast.error('Completa nombre y fecha de la planificación.')
      return
    }

    agregarPlanificacionMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        nombre: planificacionForm.nombre.trim(),
        fecha: planificacionForm.fecha,
        proximaFecha: planificacionForm.proximaFecha || undefined,
      },
    })
  }

  const handleAgregarCondicion = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!condicionForm.nombre.trim()) {
      toast.error('Completa el nombre de la condición cronica.')
      return
    }

    agregarCondicionMutation.mutate({
      mascotaId: selectedPet.id,
      payload: {
        nombre: condicionForm.nombre.trim(),
        fechaDiagnostico: condicionForm.fechaDiagnostico || undefined,
        tratamientoActual: condicionForm.tratamientoActual.trim() || undefined,
      },
    })
  }

  if (!rolPermitido) {
    return <RestrictedAntecedentesPage />
  }

  const sexoTexto =
    selectedPet?.sexo === 'macho' ? 'macho' : selectedPet?.sexo === 'hembra' ? 'hembra' : ''
  const subtitulo = selectedPet
    ? [
        etiquetaEspecie(selectedPet.especie),
        selectedPet.raza,
        sexoTexto,
        selectedPet.Propietario?.nombre ? `tutor ${selectedPet.Propietario.nombre}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Alergias, vacunas, cirugías y condiciones del paciente, a mano antes de consultar.'
  const mostrarResultados = selectedPet ? Boolean(petSearch.trim()) : true
  const cargandoAntecedentes = Boolean(selectedPet) && antecedentesQuery.isPending
  const medicamentosTexto = mapMedicamentosToText(selectedAntecedentes?.medicamentosActuales)
  const guardando =
    actualizarGeneralesMutation.isPending ||
    agregarAlergiaMutation.isPending ||
    agregarVacunaMutation.isPending ||
    agregarDesparasitacionMutation.isPending ||
    agregarPlanificacionMutation.isPending ||
    agregarCirugiaMutation.isPending ||
    agregarCondicionMutation.isPending

  const selectorPaciente = (
    <div className="relative w-full sm:w-72">
      <label className="flex h-12 items-center gap-2.5 rounded-lg border border-input bg-card px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 shrink-0" />
        <input
          type="search"
          value={petSearch}
          onChange={(e) => setPetSearch(e.target.value)}
          placeholder={selectedPet ? 'Cambiar de paciente' : 'Buscar paciente por nombre'}
          aria-label={selectedPet ? 'Cambiar de paciente' : 'Buscar paciente'}
          className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none lg:text-[15px] [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>
      {selectedPet && mostrarResultados && mascotas.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 flex flex-col gap-0.5 rounded-xl bg-popover p-1.5 shadow-lg">
          {mascotas.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => handleSelectPet(pet)}
              className={`flex w-full items-center justify-between gap-3 min-h-11 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-muted ${FOCO}`}
            >
              <span className="min-w-0 truncate">
                <span className="font-semibold text-foreground">{pet.nombre}</span>
                <span className="ml-2 text-muted-foreground">{etiquetaEspecie(pet.especie)}</span>
              </span>
              <span className="shrink-0 truncate text-[13px] text-muted-foreground">{pet.Propietario?.nombre || ''}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )

  return (
    <AdminShell
      currentKey="antecedentes"
      title={selectedPet ? `Antecedentes de ${selectedPet.nombre}` : 'Antecedentes'}
      hidePageHeader
      hideSearch
    >
      {!puedeVerAntecedentes ? (
        <EmptyState
          icon={<Sparkles />}
          title="Antecedentes no disponibles en el plan actual"
          description="El resumen de antecedentes hace parte del trabajo clínico diario. Si esta sección no aparece activa, revisa el plan de la clínica."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {selectedPet ? (
            <button
              type="button"
              onClick={handleVolverALista}
              className={`inline-flex min-h-11 items-center gap-1.5 self-start rounded text-sm font-medium text-muted-foreground transition hover:text-foreground lg:mt-6 ${FOCO}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Elegir otro paciente
            </button>
          ) : null}

          {/* Encabezado: paciente y buscador */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              {selectedPet ? (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-accent text-[28px] font-bold text-primary">
                  {selectedPet.fotoPerfil ? (
                    <img src={selectedPet.fotoPerfil} alt="" className="h-full w-full object-cover" />
                  ) : (
                    String(selectedPet.nombre || '?').charAt(0).toUpperCase()
                  )}
                </span>
              ) : null}
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-[38px]">
                  {selectedPet ? `Antecedentes de ${selectedPet.nombre}` : 'Antecedentes'}
                </h1>
                <p className="mt-2.5 text-base text-muted-foreground">{subtitulo}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
              {selectedPet ? (
                <Link
                  to={`/pacientes/${selectedPet.id}/historial`}
                  className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px ${FOCO}`}
                >
                  Abrir ficha
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              {selectorPaciente}
            </div>
          </header>

          {antecedentesQuery.isError ? (
            <div className="rounded-2xl bg-danger-soft px-5 py-4 text-sm leading-6 text-danger">
              {getErrorMessage(antecedentesQuery.error, 'No fue posible cargar los antecedentes del paciente.')}
            </div>
          ) : null}

          {!selectedPet ? (
            /* Sin paciente: lista para elegir */
            <section aria-labelledby="ant-elegir" className="rounded-2xl bg-card p-4 sm:p-6">
              <h2 id="ant-elegir" className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                {petSearch.trim() ? 'Resultados' : 'Elige un paciente'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Busca por nombre o elige uno de la lista para ver y registrar sus antecedentes.
              </p>
              <div className="mt-4 flex flex-col gap-0.5">
                {mascotas.length === 0 ? (
                  <Vacio>
                    {mascotasQuery.isPending ? 'Cargando pacientes...' : 'No encontramos pacientes con ese nombre.'}
                  </Vacio>
                ) : (
                  mascotas.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => handleSelectPet(pet)}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted ${FOCO}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-base font-bold text-primary">
                        {pet.fotoPerfil ? (
                          <img src={pet.fotoPerfil} alt="" className="h-full w-full object-cover" />
                        ) : (
                          String(pet.nombre || '?').charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-foreground">{pet.nombre}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {[etiquetaEspecie(pet.especie), pet.raza].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
                        {pet.Propietario?.nombre || ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : cargandoAntecedentes ? (
            <div className="flex flex-col gap-6">
              <div className="h-44 animate-pulse rounded-2xl bg-card" />
              <div className="h-56 animate-pulse rounded-2xl bg-card" />
            </div>
          ) : (
            <>
              {/* Alerta de alergias: lo primero que se debe ver */}
              {alergiasRows.length > 0 ? (
                <section
                  aria-labelledby="ant-alerta"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-danger-soft px-4 py-4 text-danger sm:px-6 sm:py-[18px]"
                >
                  <div className="flex items-center gap-3.5">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                      <h2 id="ant-alerta" className="text-base font-semibold">
                        {alergiasRows.length === 1 ? 'Alergia: ' : 'Alergias: '}
                        {alergiasRows.map((row) => (row.descripcion !== 'Sin descripción' ? row.descripcion : row.tipo)).join(', ')}
                      </h2>
                      <p className="text-sm">
                        {alergiasRows
                          .map((row) => [row.tipo, row.reaccion !== 'Sin reacción' ? row.reaccion : null].filter(Boolean).join(' · '))
                          .join(' / ')}
                      </p>
                    </div>
                  </div>
                  {puedeEditar ? (
                    <button
                      type="button"
                      onClick={() => openAntDrawer('alergia')}
                      className={`inline-flex h-11 items-center rounded-lg bg-card px-4 text-sm font-semibold text-danger transition hover:brightness-95 active:translate-y-px ${FOCO}`}
                    >
                      Agregar alergia
                    </button>
                  ) : null}
                </section>
              ) : null}

              <div className="flex min-w-0 flex-col gap-6">
                  {/* Datos generales */}
                  <SeccionCard
                    id="ant-generales"
                    title="Datos generales"
                    actionLabel="Editar"
                    onAction={puedeEditar ? () => openAntDrawer('generales') : null}
                  >
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-[13px] text-muted-foreground">Esterilizado</dt>
                        <dd className="mt-1 text-base font-medium text-foreground">
                          {selectedAntecedentes?.esterilizado
                            ? `Sí${selectedAntecedentes.fechaEsterilizacion ? ` · ${formatLongDate(selectedAntecedentes.fechaEsterilizacion)}` : ''}`
                            : 'No'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] text-muted-foreground">Medicación actual</dt>
                        <dd className="mt-1 whitespace-pre-line text-base font-medium text-foreground">
                          {medicamentosTexto || 'Ninguna registrada'}
                        </dd>
                      </div>
                    </dl>
                    {selectedAntecedentes?.observacionesGenerales ? (
                      <p className="rounded-xl bg-muted px-4 py-3.5 text-[15px] leading-6 text-foreground">
                        {selectedAntecedentes.observacionesGenerales}
                      </p>
                    ) : null}
                  </SeccionCard>

                  {/* Vacunas */}
                  <SeccionCard
                    id="ant-vacunas"
                    title="Vacunas"
                    count={vacunasRows.length}
                    actionLabel="Registrar vacuna"
                    primaria
                    onAction={puedeEditar ? () => openAntDrawer('vacuna') : null}
                  >
                    {vacunasRows.length === 0 ? (
                      <Vacio>Aún no hay vacunas registradas.</Vacio>
                    ) : (
                      <>
                      <ul className="flex flex-col gap-2.5 lg:hidden">
                        {vacunasRows.map((row) => (
                          <li key={row.id} className="rounded-xl border border-border bg-background p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 text-base font-semibold text-foreground">{row.nombre}</p>
                              {row.diasVencida > 0 ? (
                                <Chip className="bg-danger-soft text-danger">
                                  {row.diasVencida === 1 ? 'Vencida hace 1 día' : `Vencida hace ${row.diasVencida} días`}
                                </Chip>
                              ) : !row.proximaDosis ? (
                                <Chip className="bg-muted text-muted-foreground">Sin refuerzo</Chip>
                              ) : (
                                <Chip className="bg-success-soft text-success">Al día</Chip>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Aplicada {row.fecha} · Próxima dosis {row.proximaDosis || '—'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Lote {row.lote} · {row.laboratorio}
                            </p>
                            <div className="mt-1">
                              <BotonRecordar item={row} tutor={tutor} mascotaNombre={selectedPet.nombre} clinica={clinica} />
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="-mx-2 hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[600px] text-sm">
                          <thead>
                            <tr className="text-left text-[13px] text-muted-foreground">
                              <th scope="col" className="px-2 pb-2.5 font-medium">Vacuna</th>
                              <th scope="col" className="px-2 pb-2.5 font-medium">Aplicada</th>
                              <th scope="col" className="px-2 pb-2.5 font-medium">Próxima dosis</th>
                              <th scope="col" className="px-2 pb-2.5 font-medium">Lote</th>
                              <th scope="col" className="px-2 pb-2.5 font-medium">Laboratorio</th>
                              <th scope="col" className="px-2 pb-2.5 font-medium">Estado</th>
                              <th scope="col" className="px-2 pb-2.5"><span className="sr-only">Recordatorio</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {vacunasRows.map((row) => (
                              <tr key={row.id} className="border-t border-border">
                                <td className="px-2 py-3 font-semibold text-foreground">{row.nombre}</td>
                                <td className="whitespace-nowrap px-2 py-3">{row.fecha}</td>
                                <td className="whitespace-nowrap px-2 py-3">{row.proximaDosis || '—'}</td>
                                <td className="whitespace-nowrap px-2 py-3">{row.lote}</td>
                                <td className="px-2 py-3">{row.laboratorio}</td>
                                <td className="px-2 py-3">
                                  {row.diasVencida > 0 ? (
                                    <Chip className="bg-danger-soft text-danger">
                                      {row.diasVencida === 1 ? 'Vencida hace 1 día' : `Vencida hace ${row.diasVencida} días`}
                                    </Chip>
                                  ) : !row.proximaDosis ? (
                                    <Chip className="bg-muted text-muted-foreground">Sin refuerzo</Chip>
                                  ) : (
                                    <Chip className="bg-success-soft text-success">Al día</Chip>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-2 py-3 text-right">
                                  <BotonRecordar
                                    item={row}
                                    tutor={tutor}
                                    mascotaNombre={selectedPet.nombre}
                                    clinica={clinica}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </>
                    )}
                  </SeccionCard>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Alergias */}
                    <SeccionCard
                      id="ant-alergias"
                      title="Alergias"
                      count={alergiasRows.length}
                      onAction={puedeEditar ? () => openAntDrawer('alergia') : null}
                    >
                      {alergiasRows.length === 0 ? (
                        <Vacio>Aún no hay alergias registradas.</Vacio>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {alergiasRows.map((row) => (
                            <Item
                              key={row.id}
                              className="bg-danger-soft text-danger"
                              titulo={`${row.tipo} · ${row.descripcion}`}
                              detalle={row.reaccion !== 'Sin reacción' ? row.reaccion : null}
                              extra={row.fecha}
                            />
                          ))}
                        </div>
                      )}
                    </SeccionCard>

                    {/* Cirugías */}
                    <SeccionCard
                      id="ant-cirugias"
                      title="Cirugías"
                      count={cirugiasRows.length}
                      onAction={puedeEditar ? () => openAntDrawer('cirugia') : null}
                    >
                      {cirugiasRows.length === 0 ? (
                        <Vacio>Aún no hay cirugías registradas.</Vacio>
                      ) : (
                        <div className="flex flex-col">
                          {cirugiasRows.map((row) => (
                            <Item
                              key={row.id}
                              className="px-0 text-foreground"
                              titulo={row.nombre}
                              detalle={[row.fecha, row.veterinario !== 'Sin profesional' ? row.veterinario : null].filter(Boolean).join(' · ')}
                              extra={row.observaciones !== 'Sin observaciones' ? row.observaciones : null}
                            />
                          ))}
                        </div>
                      )}
                    </SeccionCard>

                    {/* Desparasitación */}
                    <SeccionCard
                      id="ant-desparasitacion"
                      title="Desparasitación"
                      count={desparasitacionesRows.length}
                      onAction={puedeEditar ? () => openAntDrawer('desparasitacion') : null}
                    >
                      {desparasitacionesRows.length === 0 ? (
                        <Vacio>Aún no hay desparasitaciones registradas.</Vacio>
                      ) : (
                        <div className="flex flex-col">
                          {desparasitacionesRows.map((row) => (
                            <Item
                              key={row.id}
                              className="px-0 text-foreground"
                              titulo={<span className="capitalize">{row.tipo}{row.producto !== 'Sin producto' ? ` · ${row.producto}` : ''}</span>}
                              detalle={`Aplicada el ${row.fecha}`}
                              extra={
                                <>
                                  {row.proximaFecha !== 'Sin fecha programada' ? `Próxima: ${row.proximaFecha}` : null}
                                  <BotonRecordar item={row} tutor={tutor} mascotaNombre={selectedPet.nombre} clinica={clinica} bloque />
                                </>
                              }
                              chip={row.vencida ? <Chip className="bg-warning-soft text-warning">Vencida</Chip> : null}
                            />
                          ))}
                        </div>
                      )}
                    </SeccionCard>

                    {/* Planificación */}
                    <SeccionCard
                      id="ant-planificacion"
                      title="Planificación"
                      count={planificacionesRows.length}
                      onAction={puedeEditar ? () => openAntDrawer('planificacion') : null}
                    >
                      {planificacionesRows.length === 0 ? (
                        <Vacio>Aún no hay planificaciones registradas.</Vacio>
                      ) : (
                        <div className="flex flex-col">
                          {planificacionesRows.map((row) => (
                            <Item
                              key={row.id}
                              className="px-0 text-foreground"
                              titulo={row.nombre}
                              detalle={`Aplicada el ${row.fecha}`}
                              extra={row.proximaFecha !== 'Sin fecha programada' ? `Próxima: ${row.proximaFecha}` : null}
                            />
                          ))}
                        </div>
                      )}
                    </SeccionCard>
                  </div>

                  {/* Condiciones crónicas */}
                  <SeccionCard
                    id="ant-condiciones"
                    title="Condiciones crónicas"
                    count={condicionesRows.length}
                    onAction={puedeEditar ? () => openAntDrawer('condicion') : null}
                  >
                    {condicionesRows.length === 0 ? (
                      <Vacio>Aún no hay condiciones crónicas registradas.</Vacio>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {condicionesRows.map((row) => (
                          <Item
                            key={row.id}
                            className="bg-warning-soft text-warning"
                            titulo={row.nombre}
                            detalle={row.tratamientoActual !== 'Sin tratamiento actual' ? row.tratamientoActual : null}
                            extra={row.fechaDiagnostico !== 'Sin fecha' ? `Diagnosticada el ${row.fechaDiagnostico}` : null}
                          />
                        ))}
                      </div>
                    )}
                  </SeccionCard>

                  <VidaEnLaClinica
                    historias={historiasQuery.data?.historias || []}
                    antecedentes={selectedAntecedentes}
                    mascota={selectedPet}
                    cargando={historiasQuery.isPending}
                  />
                </div>
            </>
          )}
        </div>
      )}

      {/* ── Drawer: Antecedentes ── */}
      {createPortal(
        <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${antDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setAntDrawerOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[480px] ${antDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {antDrawerType === 'alergia' && 'Agregar alergia'}
              {antDrawerType === 'vacuna' && 'Registrar vacuna'}
              {antDrawerType === 'desparasitacion' && 'Agregar desparasitación'}
              {antDrawerType === 'planificacion' && 'Agregar planificación'}
              {antDrawerType === 'cirugia' && 'Agregar cirugía'}
              {antDrawerType === 'condicion' && 'Agregar condición crónica'}
              {antDrawerType === 'generales' && 'Datos generales'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedPet?.nombre || 'Paciente'} · {etiquetaEspecie(selectedPet?.especie)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAntDrawerOpen(false)}
            aria-label="Cerrar"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px ${FOCO}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Generales */}
          {antDrawerType === 'generales' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleGuardarGenerales}>
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg bg-muted px-3 text-sm text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={generalValues.esterilizado} onChange={(e) => updateGeneralDraft('esterilizado', e.target.checked)} />
                Paciente esterilizado
              </label>
              <Campo label="Fecha de esterilización">
                <input type="date" value={generalValues.fechaEsterilizacion} onChange={(e) => updateGeneralDraft('fechaEsterilizacion', e.target.value)} className={CAMPO} />
              </Campo>
              <Campo label="Medicamentos actuales">
                <textarea value={generalValues.medicamentosActualesTexto} onChange={(e) => updateGeneralDraft('medicamentosActualesTexto', e.target.value)} placeholder="Uno por línea" className={CAMPO_AREA} />
              </Campo>
              <Campo label="Observaciones generales">
                <textarea value={generalValues.observacionesGenerales} onChange={(e) => updateGeneralDraft('observacionesGenerales', e.target.value)} placeholder="Lo que el equipo debe saber antes de atenderlo" className={CAMPO_AREA} />
              </Campo>
            </form>
          )}

          {/* Alergia */}
          {antDrawerType === 'alergia' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarAlergia}>
              <Campo label="Tipo de alergia">
                <input type="text" value={alergiaForm.tipo} onChange={(e) => setAlergiaForm((c) => ({ ...c, tipo: e.target.value }))} placeholder="Alimentaria, medicamento, ambiental..." className={CAMPO} />
              </Campo>
              <Campo label="Descripción">
                <input type="text" value={alergiaForm.descripcion} onChange={(e) => setAlergiaForm((c) => ({ ...c, descripcion: e.target.value }))} placeholder="A qué es alérgico" className={CAMPO} />
              </Campo>
              <Campo label="Reacción observada">
                <input type="text" value={alergiaForm.reaccion} onChange={(e) => setAlergiaForm((c) => ({ ...c, reaccion: e.target.value }))} placeholder="Opcional" className={CAMPO} />
              </Campo>
              <Campo label="Fecha">
                <input type="date" value={alergiaForm.fecha} onChange={(e) => setAlergiaForm((c) => ({ ...c, fecha: e.target.value }))} className={CAMPO} />
              </Campo>
            </form>
          )}

          {/* Vacuna */}
          {antDrawerType === 'vacuna' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarVacuna}>
              <Campo label="Nombre de la vacuna">
                <input type="text" value={vacunaForm.nombre} onChange={(e) => setVacunaForm((c) => ({ ...c, nombre: e.target.value }))} placeholder="Múltiple, antirrábica..." className={CAMPO} />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de aplicación">
                  <input type="date" value={vacunaForm.fecha} onChange={(e) => setVacunaForm((c) => ({ ...c, fecha: e.target.value }))} className={CAMPO} />
                </Campo>
                <Campo label="Próxima dosis">
                  <input type="date" value={vacunaForm.proximaDosis} onChange={(e) => setVacunaForm((c) => ({ ...c, proximaDosis: e.target.value }))} className={CAMPO} />
                </Campo>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Lote">
                  <input type="text" value={vacunaForm.lote} onChange={(e) => setVacunaForm((c) => ({ ...c, lote: e.target.value }))} placeholder="Opcional" className={CAMPO} />
                </Campo>
                <Campo label="Laboratorio">
                  <input type="text" value={vacunaForm.laboratorio} onChange={(e) => setVacunaForm((c) => ({ ...c, laboratorio: e.target.value }))} placeholder="Opcional" className={CAMPO} />
                </Campo>
              </div>
            </form>
          )}

          {/* Desparasitación */}
          {antDrawerType === 'desparasitacion' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarDesparasitacion}>
              <div className="grid gap-1.5">
                <p className="text-[13px] font-medium text-muted-foreground">Tipo de desparasitación</p>
                <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Tipo de desparasitación">
                  {[
                    { value: 'interna', label: 'Interna' },
                    { value: 'externa', label: 'Externa' },
                    { value: 'ambas', label: 'Ambas' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={desparasitacionForm.tipo === option.value}
                      onClick={() => setDesparasitacionForm((c) => ({ ...c, tipo: option.value }))}
                      className={cn(
                        'h-10 flex-1 rounded-md text-sm font-semibold transition',
                        FOCO,
                        desparasitacionForm.tipo === option.value
                          ? 'bg-card text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <Campo label="Producto">
                <input type="text" value={desparasitacionForm.producto} onChange={(e) => setDesparasitacionForm((c) => ({ ...c, producto: e.target.value }))} placeholder="Opcional" className={CAMPO} />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de aplicación">
                  <input type="date" value={desparasitacionForm.fecha} onChange={(e) => setDesparasitacionForm((c) => ({ ...c, fecha: e.target.value }))} className={CAMPO} />
                </Campo>
                <Campo label="Próxima fecha">
                  <input type="date" value={desparasitacionForm.proximaFecha} onChange={(e) => setDesparasitacionForm((c) => ({ ...c, proximaFecha: e.target.value }))} className={CAMPO} />
                </Campo>
              </div>
            </form>
          )}

          {/* Planificación */}
          {antDrawerType === 'planificacion' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarPlanificacion}>
              <Campo label="Método de planificación">
                <input type="text" value={planificacionForm.nombre} onChange={(e) => setPlanificacionForm((c) => ({ ...c, nombre: e.target.value }))} className={CAMPO} />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Fecha de aplicación">
                  <input type="date" value={planificacionForm.fecha} onChange={(e) => setPlanificacionForm((c) => ({ ...c, fecha: e.target.value }))} className={CAMPO} />
                </Campo>
                <Campo label="Próxima fecha">
                  <input type="date" value={planificacionForm.proximaFecha} onChange={(e) => setPlanificacionForm((c) => ({ ...c, proximaFecha: e.target.value }))} className={CAMPO} />
                </Campo>
              </div>
            </form>
          )}

          {/* Cirugia */}
          {antDrawerType === 'cirugia' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarCirugia}>
              <Campo label="Nombre de la cirugía">
                <input type="text" value={cirugiaForm.nombre} onChange={(e) => setCirugiaForm((c) => ({ ...c, nombre: e.target.value }))} className={CAMPO} />
              </Campo>
              <Campo label="Fecha">
                <input type="date" value={cirugiaForm.fecha} onChange={(e) => setCirugiaForm((c) => ({ ...c, fecha: e.target.value }))} className={CAMPO} />
              </Campo>
              <Campo label="Profesional o referencia">
                <input type="text" value={cirugiaForm.veterinario} onChange={(e) => setCirugiaForm((c) => ({ ...c, veterinario: e.target.value }))} placeholder="Opcional" className={CAMPO} />
              </Campo>
              <Campo label="Observaciones">
                <textarea value={cirugiaForm.observaciones} onChange={(e) => setCirugiaForm((c) => ({ ...c, observaciones: e.target.value }))} placeholder="Complicaciones o notas relevantes" className={CAMPO_AREA} />
              </Campo>
            </form>
          )}

          {/* Condicion */}
          {antDrawerType === 'condicion' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarCondicion}>
              <Campo label="Nombre de la condición">
                <input type="text" value={condicionForm.nombre} onChange={(e) => setCondicionForm((c) => ({ ...c, nombre: e.target.value }))} className={CAMPO} />
              </Campo>
              <Campo label="Fecha de diagnóstico">
                <input type="date" value={condicionForm.fechaDiagnostico} onChange={(e) => setCondicionForm((c) => ({ ...c, fechaDiagnostico: e.target.value }))} className={CAMPO} />
              </Campo>
              <Campo label="Tratamiento actual">
                <textarea value={condicionForm.tratamientoActual} onChange={(e) => setCondicionForm((c) => ({ ...c, tratamientoActual: e.target.value }))} placeholder="Tratamiento o seguimiento" className={CAMPO_AREA} />
              </Campo>
            </form>
          )}
        </div>

        <div className="flex gap-2.5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <button type="submit" form="ant-drawer-form" disabled={guardando} className={cn(BTN_PRIMARIO, 'h-11 flex-1')}>
            Guardar
          </button>
          <button type="button" onClick={() => setAntDrawerOpen(false)} className={cn(BTN_SECUNDARIO, 'h-11 px-5')}>
            Cancelar
          </button>
        </div>
      </div>
        </>,
        document.body
      )}
    </AdminShell>
  )
}
