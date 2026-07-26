import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle, ChevronDown, ClipboardList, HeartPulse, Plus, Search, ShieldCheck, Stethoscope, X } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatLongDate, formatNumber } from '@/features/dashboard/dashboardUtils'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'antecedentes', label: 'Antecedentes' },
]

const TODAY = new Date().toISOString().slice(0, 10)

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
  fecha: TODAY,
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

const buildRows = (items, mapper) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    id: item.id || `${index}`,
    ...mapper(item),
  }))

// ─── Acordeón por sección clínica ─────────────────────────────────────────────

function AccordionSection({ icon, title, accentColor, badgeCount, addLabel = '+ Agregar', onAdd, disabled, open, onToggle, children }) {
  return (
    <div
      className="overflow-hidden border border-border bg-card"
      style={{ borderLeftWidth: '3px', borderLeftColor: accentColor }}
    >
      {/* Header del acordeón */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={!disabled ? onToggle : undefined}
        onKeyDown={(e) => !disabled && (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-colors select-none',
          disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-muted/40'
        )}
      >
        <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>

        {badgeCount !== null && badgeCount !== undefined && (
          <span className={cn(
            'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
            badgeCount > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {badgeCount}
          </span>
        )}

        {onAdd && (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onAdd() }}
            className="inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addLabel.startsWith('+') && <Plus className="h-3 w-3" />}
            {addLabel.replace('+ ', '').replace('+', '')}
          </button>
        )}

        <ChevronDown className={cn(
          'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
          open && 'rotate-180'
        )} />
      </div>

      {/* Cuerpo con animación de grid-rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms ease',
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-4 py-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function RestrictedAntecedentesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Antecedentes"
          subtitle="Esta sección se muestra a veterinarios, auxiliares o administración autorizada."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad sobre los antecedentes clinicos del paciente.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function AntecedentesPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefillAppliedRef = useRef(false)
  const mascotaIdPrefill = searchParams.get('mascotaId') || ''

  const [activeTab, setActiveTab] = useState('resumen')
  const [antDrawerOpen, setAntDrawerOpen] = useState(false)
  const [antDrawerType, setAntDrawerType] = useState(null) // 'alergia'|'vacuna'|'cirugia'|'condicion'|'generales'
  const [petSearch, setPetSearch] = useState('')
  const [selectedPet, setSelectedPet] = useState(null)
  const [generalDraft, setGeneralDraft] = useState(null)
  const [alergiaForm, setAlergiaForm] = useState(DEFAULT_ALERGIA_FORM)
  const [cirugiaForm, setCirugiaForm] = useState(DEFAULT_CIRUGIA_FORM)
  const [vacunaForm, setVacunaForm] = useState(DEFAULT_VACUNA_FORM)
  const [condicionForm, setCondicionForm] = useState(DEFAULT_CONDICION_FORM)
  const [openSections, setOpenSections] = useState(new Set())

  const toggleSection = (id) =>
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar'])
  const puedeEditar = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  const featureSet = new Set(
    Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  )
  const puedeVerAntecedentes = featureSet.has('antecedentes')

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
        setActiveTab('antecedentes')
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
      queryClient.invalidateQueries({ queryKey: ['antecedentes-detalle'] })
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
      queryClient.invalidateQueries({ queryKey: ['antecedentes-detalle'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la alergia.'))
    },
  })

  const agregarCirugiaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarCirugia(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Cirugia agregada exitosamente')
      setCirugiaForm(DEFAULT_CIRUGIA_FORM)
      setAntDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['antecedentes-detalle'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la cirugia.'))
    },
  })

  const agregarVacunaMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarVacuna(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Vacuna agregada exitosamente')
      setVacunaForm(DEFAULT_VACUNA_FORM)
      setAntDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['antecedentes-detalle'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la vacuna.'))
    },
  })

  const agregarCondicionMutation = useMutation({
    mutationFn: ({ mascotaId, payload }) => antecedentesApi.agregarCondicion(mascotaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Condicion cronica agregada exitosamente')
      setCondicionForm(DEFAULT_CONDICION_FORM)
      setAntDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['antecedentes-detalle'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible agregar la condicion cronica.'))
    },
  })

  const mascotas = mascotasQuery.data?.mascotas || []
  const alergiasRows = buildRows(selectedAntecedentes?.alergias, (item) => ({
    tipo: item.tipo || 'Sin tipo',
    descripcion: item.descripcion || 'Sin descripcion',
    reaccion: item.reaccion || 'Sin reaccion',
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
    fecha: item.fecha ? formatLongDate(item.fecha) : 'Sin fecha',
    proximaDosis: item.proximaDosis ? formatLongDate(item.proximaDosis) : 'Sin dosis programada',
    lote: item.lote || 'Sin lote',
  }))
  const condicionesRows = buildRows(selectedAntecedentes?.condicionesCronicas, (item) => ({
    nombre: item.nombre || 'Sin nombre',
    fechaDiagnostico: item.fechaDiagnostico ? formatLongDate(item.fechaDiagnostico) : 'Sin fecha',
    tratamientoActual: item.tratamientoActual || 'Sin tratamiento actual',
  }))

  const handleSelectPet = (pet) => {
    setSelectedPet(pet)
    setGeneralDraft(null)
    setAlergiaForm(DEFAULT_ALERGIA_FORM)
    setCirugiaForm(DEFAULT_CIRUGIA_FORM)
    setVacunaForm(DEFAULT_VACUNA_FORM)
    setCondicionForm(DEFAULT_CONDICION_FORM)
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
      toast.error('Completa tipo y descripcion de la alergia.')
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
      toast.error('Completa nombre y fecha de la cirugia.')
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

  const handleAgregarCondicion = (event) => {
    event.preventDefault()

    if (!requireSelectedPet()) return
    if (!condicionForm.nombre.trim()) {
      toast.error('Completa el nombre de la condicion cronica.')
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

  return (
    <AdminShell
      currentKey="antecedentes"
      title="Antecedentes del paciente"
      description="Modulo clinico para dejar visible el contexto permanente del paciente antes de consultar: alergias, vacunas, cirugias, condiciones cronicas y notas generales."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">
          Contexto clinico
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/pacientes"
            className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir pacientes
          </Link>
        </div>
      }
      asideNote="La idea aqui no es repetir toda la consulta, sino dejar a mano lo que el medico necesita saber antes de atender al paciente."
    >
      {!puedeVerAntecedentes ? (
        <EmptyModuleState
          title="Antecedentes no disponibles en el plan actual"
          body="El resumen de antecedentes hace parte del trabajo clínico diario. Si esta sección no aparece activa, revisa el plan de la clínica."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-0">
          {/* Barra de tabs */}
          <div className="flex gap-0 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Resumen */}
          {activeTab === 'resumen' && (
          <div className="space-y-5 pt-5">
          {!selectedPet ? (
            <div className="border border-border bg-muted px-4 py-5 text-sm text-muted-foreground">
              Selecciona un paciente en el tab <span className="font-semibold">Antecedentes</span> para ver sus estadísticas clínicas.
            </div>
          ) : (
          <>
          {antecedentesQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {getErrorMessage(antecedentesQuery.error, 'No fue posible cargar los antecedentes del paciente.')}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={HeartPulse}
              label="Alergias"
              value={formatNumber(alergiasRows.length)}
              helper="Alertas clinicas visibles para la atencion."
              tone="text-rose-700"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Vacunas"
              value={formatNumber(vacunasRows.length)}
              helper="Vacunas registradas dentro del expediente."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={Stethoscope}
              label="Cirugias"
              value={formatNumber(cirugiasRows.length)}
              helper="Procedimientos previos relevantes."
              tone="text-primary"
            />
            <KpiCard
              icon={HeartPulse}
              label="Condiciones cronicas"
              value={formatNumber(condicionesRows.length)}
              helper="Problemas permanentes o de seguimiento."
              tone="text-amber-700"
            />
          </div>
          </>
          )}
          </div>
          )}

          {/* Tab: Antecedentes */}
          {activeTab === 'antecedentes' && (
          <div className="space-y-4 pt-5">
            {antecedentesQuery.isError && (
              <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                {getErrorMessage(antecedentesQuery.error, 'No fue posible cargar los antecedentes del paciente.')}
              </div>
            )}

            {/* ── Selector de mascota compacto ── */}
            {selectedPet ? (
              <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex-shrink-0 text-lg">🐾</span>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPet.nombre}</span>
                    <span className="text-sm text-muted-foreground"> · {selectedPet.especie}{selectedPet.Propietario?.nombre ? ` · ${selectedPet.Propietario.nombre}` : ''}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPet(null); setGeneralDraft(null) }}
                  className="ml-4 flex-shrink-0 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={petSearch}
                    onChange={(e) => setPetSearch(e.target.value)}
                    placeholder="Buscar paciente por nombre o microchip"
                    className="h-11 w-full border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
                {mascotas.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 border border-border border-t-0 bg-card shadow-lg">
                    {mascotas.map((pet) => (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => handleSelectPet(pet)}
                        className="flex w-full items-center justify-between border-b border-border/50 px-4 py-2.5 text-left text-sm transition hover:bg-muted last:border-0"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{pet.nombre}</span>
                          <span className="ml-2 text-muted-foreground">{pet.especie}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{pet.Propietario?.nombre || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Acordeones de secciones clínicas ── */}
            <div className="space-y-2">

              {/* Datos generales */}
              <AccordionSection
                icon={<ClipboardList className="h-4 w-4" />}
                title="Datos generales"
                accentColor="hsl(160 84% 39%)"
                badgeCount={null}
                addLabel="Editar"
                onAdd={puedeEditar ? () => openAntDrawer('generales') : null}
                disabled={!selectedPet}
                open={openSections.has('generales')}
                onToggle={() => toggleSection('generales')}
              >
                <div className="space-y-2 text-sm">
                  {selectedAntecedentes ? (
                    <>
                      <p className={selectedAntecedentes.esterilizado ? 'font-semibold text-emerald-700' : 'text-muted-foreground'}>
                        {selectedAntecedentes.esterilizado
                          ? `Esterilizado${selectedAntecedentes.fechaEsterilizacion ? ` · ${formatLongDate(selectedAntecedentes.fechaEsterilizacion)}` : ''}`
                          : 'No esterilizado'}
                      </p>
                      {selectedAntecedentes.medicamentosActuales?.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Medicamentos actuales</p>
                          <p className="whitespace-pre-line text-foreground">{mapMedicamentosToText(selectedAntecedentes.medicamentosActuales)}</p>
                        </div>
                      )}
                      {selectedAntecedentes.observacionesGenerales && (
                        <p className="text-muted-foreground">{selectedAntecedentes.observacionesGenerales}</p>
                      )}
                      {!selectedAntecedentes.esterilizado && !selectedAntecedentes.medicamentosActuales?.length && !selectedAntecedentes.observacionesGenerales && (
                        <p className="italic text-muted-foreground">Sin datos generales registrados aún.</p>
                      )}
                    </>
                  ) : (
                    <p className="italic text-muted-foreground">Sin datos generales registrados aún.</p>
                  )}
                </div>
              </AccordionSection>

              {/* Alergias */}
              <AccordionSection
                icon={<HeartPulse className="h-4 w-4" />}
                title="Alergias"
                accentColor="#f43f5e"
                badgeCount={alergiasRows.length}
                addLabel="+ Agregar"
                onAdd={puedeEditar ? () => openAntDrawer('alergia') : null}
                disabled={!selectedPet}
                open={openSections.has('alergias')}
                onToggle={() => toggleSection('alergias')}
              >
                {alergiasRows.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Aún no hay alergias registradas.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {alergiasRows.slice(0, 5).map((row) => (
                      <div key={row.id} className="py-2 text-sm">
                        <span className="font-semibold text-foreground">{row.tipo}</span>
                        <span className="text-muted-foreground"> · {row.descripcion}</span>
                        {row.reaccion !== 'Sin reaccion' && <span className="text-muted-foreground"> · {row.reaccion}</span>}
                        <span className="ml-2 text-xs text-muted-foreground">{row.fecha}</span>
                      </div>
                    ))}
                    {alergiasRows.length > 5 && (
                      <p className="pt-2 text-xs text-muted-foreground">+{alergiasRows.length - 5} más</p>
                    )}
                  </div>
                )}
              </AccordionSection>

              {/* Vacunas */}
              <AccordionSection
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Vacunas"
                accentColor="#059669"
                badgeCount={vacunasRows.length}
                addLabel="+ Agregar"
                onAdd={puedeEditar ? () => openAntDrawer('vacuna') : null}
                disabled={!selectedPet}
                open={openSections.has('vacunas')}
                onToggle={() => toggleSection('vacunas')}
              >
                {vacunasRows.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Aún no hay vacunas registradas.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {vacunasRows.slice(0, 5).map((row) => (
                      <div key={row.id} className="py-2 text-sm">
                        <span className="font-semibold text-foreground">{row.nombre}</span>
                        <span className="text-muted-foreground"> · {row.fecha}</span>
                        {row.proximaDosis !== 'Sin dosis programada' && (
                          <span className="text-muted-foreground"> → {row.proximaDosis}</span>
                        )}
                        {row.lote !== 'Sin lote' && (
                          <span className="ml-2 text-xs text-muted-foreground">Lote: {row.lote}</span>
                        )}
                      </div>
                    ))}
                    {vacunasRows.length > 5 && (
                      <p className="pt-2 text-xs text-muted-foreground">+{vacunasRows.length - 5} más</p>
                    )}
                  </div>
                )}
              </AccordionSection>

              {/* Cirugías */}
              <AccordionSection
                icon={<Stethoscope className="h-4 w-4" />}
                title="Cirugías"
                accentColor="#3b82f6"
                badgeCount={cirugiasRows.length}
                addLabel="+ Agregar"
                onAdd={puedeEditar ? () => openAntDrawer('cirugia') : null}
                disabled={!selectedPet}
                open={openSections.has('cirugias')}
                onToggle={() => toggleSection('cirugias')}
              >
                {cirugiasRows.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Aún no hay cirugías registradas.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {cirugiasRows.slice(0, 5).map((row) => (
                      <div key={row.id} className="py-2 text-sm">
                        <span className="font-semibold text-foreground">{row.nombre}</span>
                        <span className="text-muted-foreground"> · {row.fecha}</span>
                        {row.veterinario !== 'Sin profesional' && (
                          <span className="text-muted-foreground"> · {row.veterinario}</span>
                        )}
                      </div>
                    ))}
                    {cirugiasRows.length > 5 && (
                      <p className="pt-2 text-xs text-muted-foreground">+{cirugiasRows.length - 5} más</p>
                    )}
                  </div>
                )}
              </AccordionSection>

              {/* Condiciones crónicas */}
              <AccordionSection
                icon={<AlertCircle className="h-4 w-4" />}
                title="Condiciones crónicas"
                accentColor="#d97706"
                badgeCount={condicionesRows.length}
                addLabel="+ Agregar"
                onAdd={puedeEditar ? () => openAntDrawer('condicion') : null}
                disabled={!selectedPet}
                open={openSections.has('condiciones')}
                onToggle={() => toggleSection('condiciones')}
              >
                {condicionesRows.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Aún no hay condiciones crónicas registradas.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {condicionesRows.slice(0, 5).map((row) => (
                      <div key={row.id} className="py-2 text-sm">
                        <span className="font-semibold text-foreground">{row.nombre}</span>
                        {row.fechaDiagnostico !== 'Sin fecha' && (
                          <span className="text-muted-foreground"> · {row.fechaDiagnostico}</span>
                        )}
                        {row.tratamientoActual !== 'Sin tratamiento actual' && (
                          <span className="text-muted-foreground"> · {row.tratamientoActual}</span>
                        )}
                      </div>
                    ))}
                    {condicionesRows.length > 5 && (
                      <p className="pt-2 text-xs text-muted-foreground">+{condicionesRows.length - 5} más</p>
                    )}
                  </div>
                )}
              </AccordionSection>

            </div>
          </div>
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
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[480px] sm:border-l sm:border-border ${antDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {antDrawerType === 'alergia' && 'Agregar alergia'}
              {antDrawerType === 'vacuna' && 'Agregar vacuna'}
              {antDrawerType === 'cirugia' && 'Agregar cirugia'}
              {antDrawerType === 'condicion' && 'Agregar condicion cronica'}
              {antDrawerType === 'generales' && 'Datos generales'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedPet?.nombre || 'Paciente'} · {selectedPet?.especie}
            </p>
          </div>
          <button type="button" onClick={() => setAntDrawerOpen(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Generales */}
          {antDrawerType === 'generales' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleGuardarGenerales}>
              <label className="flex items-center gap-3 border border-border bg-muted px-3 py-3 text-sm text-foreground">
                <input type="checkbox" checked={generalValues.esterilizado} onChange={(e) => updateGeneralDraft('esterilizado', e.target.checked)} />
                Paciente esterilizado
              </label>
              <input type="date" value={generalValues.fechaEsterilizacion} onChange={(e) => updateGeneralDraft('fechaEsterilizacion', e.target.value)} className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <textarea value={generalValues.medicamentosActualesTexto} onChange={(e) => updateGeneralDraft('medicamentosActualesTexto', e.target.value)} placeholder="Medicamentos actuales, uno por linea" className="min-h-[110px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <textarea value={generalValues.observacionesGenerales} onChange={(e) => updateGeneralDraft('observacionesGenerales', e.target.value)} placeholder="Observaciones generales del paciente" className="min-h-[110px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary" />
            </form>
          )}

          {/* Alergia */}
          {antDrawerType === 'alergia' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarAlergia}>
              <input type="text" value={alergiaForm.tipo} onChange={(e) => setAlergiaForm((c) => ({ ...c, tipo: e.target.value }))} placeholder="Tipo de alergia" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <input type="text" value={alergiaForm.descripcion} onChange={(e) => setAlergiaForm((c) => ({ ...c, descripcion: e.target.value }))} placeholder="Descripcion" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <input type="text" value={alergiaForm.reaccion} onChange={(e) => setAlergiaForm((c) => ({ ...c, reaccion: e.target.value }))} placeholder="Reaccion observada" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <input type="date" value={alergiaForm.fecha} onChange={(e) => setAlergiaForm((c) => ({ ...c, fecha: e.target.value }))} className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
            </form>
          )}

          {/* Vacuna */}
          {antDrawerType === 'vacuna' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarVacuna}>
              <input type="text" value={vacunaForm.nombre} onChange={(e) => setVacunaForm((c) => ({ ...c, nombre: e.target.value }))} placeholder="Nombre de la vacuna" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="mb-1 text-xs text-muted-foreground">Fecha de aplicacion</p><input type="date" value={vacunaForm.fecha} onChange={(e) => setVacunaForm((c) => ({ ...c, fecha: e.target.value }))} className="h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" /></div>
                <div><p className="mb-1 text-xs text-muted-foreground">Proxima dosis</p><input type="date" value={vacunaForm.proximaDosis} onChange={(e) => setVacunaForm((c) => ({ ...c, proximaDosis: e.target.value }))} className="h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="text" value={vacunaForm.lote} onChange={(e) => setVacunaForm((c) => ({ ...c, lote: e.target.value }))} placeholder="Lote" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
                <input type="text" value={vacunaForm.laboratorio} onChange={(e) => setVacunaForm((c) => ({ ...c, laboratorio: e.target.value }))} placeholder="Laboratorio" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              </div>
            </form>
          )}

          {/* Cirugia */}
          {antDrawerType === 'cirugia' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarCirugia}>
              <input type="text" value={cirugiaForm.nombre} onChange={(e) => setCirugiaForm((c) => ({ ...c, nombre: e.target.value }))} placeholder="Nombre de la cirugia" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <input type="date" value={cirugiaForm.fecha} onChange={(e) => setCirugiaForm((c) => ({ ...c, fecha: e.target.value }))} className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <input type="text" value={cirugiaForm.veterinario} onChange={(e) => setCirugiaForm((c) => ({ ...c, veterinario: e.target.value }))} placeholder="Profesional o referencia" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <textarea value={cirugiaForm.observaciones} onChange={(e) => setCirugiaForm((c) => ({ ...c, observaciones: e.target.value }))} placeholder="Observaciones relevantes" className="min-h-[110px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary" />
            </form>
          )}

          {/* Condicion */}
          {antDrawerType === 'condicion' && (
            <form id="ant-drawer-form" className="grid gap-4" onSubmit={handleAgregarCondicion}>
              <input type="text" value={condicionForm.nombre} onChange={(e) => setCondicionForm((c) => ({ ...c, nombre: e.target.value }))} placeholder="Nombre de la condicion" className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" />
              <div><p className="mb-1 text-xs text-muted-foreground">Fecha de diagnostico</p><input type="date" value={condicionForm.fechaDiagnostico} onChange={(e) => setCondicionForm((c) => ({ ...c, fechaDiagnostico: e.target.value }))} className="h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary" /></div>
              <textarea value={condicionForm.tratamientoActual} onChange={(e) => setCondicionForm((c) => ({ ...c, tratamientoActual: e.target.value }))} placeholder="Tratamiento actual o seguimiento" className="min-h-[110px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary" />
            </form>
          )}
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="ant-drawer-form"
            disabled={
              actualizarGeneralesMutation.isPending ||
              agregarAlergiaMutation.isPending ||
              agregarVacunaMutation.isPending ||
              agregarCirugiaMutation.isPending ||
              agregarCondicionMutation.isPending
            }
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Guardar
          </button>
          <button type="button" onClick={() => setAntDrawerOpen(false)} className="border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/80">
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
