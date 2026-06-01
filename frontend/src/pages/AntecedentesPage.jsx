import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { HeartPulse, Plus, Search, ShieldCheck, Stethoscope, X } from 'lucide-react'
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

function RestrictedAntecedentesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Antecedentes"
          subtitle="Este modulo se muestra a veterinarios, auxiliares o administracion autorizada."
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
            to="/historias"
            className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir historias
          </Link>
          <Link
            to="/pacientes"
            className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
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
          body="El resumen de antecedentes hace parte del frente clinico del sistema. Si este modulo no aparece activo, revisa el plan de la clinica."
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
          <div className="space-y-5 pt-5">
          {antecedentesQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {getErrorMessage(antecedentesQuery.error, 'No fue posible cargar los antecedentes del paciente.')}
            </div>
          ) : null}
          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardPanel
              title="Seleccionar paciente"
              subtitle="Busca un paciente activo para abrir su contexto clinico."
              action={<Search className="h-4 w-4 text-primary" />}
            >
              <input
                type="text"
                value={petSearch}
                onChange={(event) => setPetSearch(event.target.value)}
                placeholder="Buscar por nombre o microchip"
                className="h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />

              <div className="mt-4 space-y-2">
                {selectedPet ? (
                  <div className="border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-foreground">
                    <p className="font-semibold text-slate-950">{selectedPet.nombre}</p>
                    <p className="mt-1">
                      {selectedPet.Propietario?.nombre || 'Sin tutor principal'} · {selectedPet.especie}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPet(null)
                        setGeneralDraft(null)
                      }}
                      className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Cambiar paciente
                    </button>
                  </div>
                ) : null}

                {!selectedPet &&
                  mascotas.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => handleSelectPet(pet)}
                      className="flex w-full items-start justify-between border border-border bg-card px-3 py-3 text-left transition hover:bg-muted"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{pet.nombre}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pet.Propietario?.nombre || 'Sin tutor principal'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Seleccionar
                      </span>
                    </button>
                  ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Resumen general"
              subtitle="Datos de contexto permanente y medicamentos actuales del paciente."
            >
              {selectedPet ? (
                <div className="space-y-3">
                  {selectedAntecedentes?.esterilizado && (
                    <p className="text-sm text-emerald-700 font-semibold">Paciente esterilizado{selectedAntecedentes.fechaEsterilizacion ? ` · ${selectedAntecedentes.fechaEsterilizacion}` : ''}</p>
                  )}
                  {selectedAntecedentes?.medicamentosActuales?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Medicamentos actuales</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{mapMedicamentosToText(selectedAntecedentes.medicamentosActuales)}</p>
                    </div>
                  )}
                  {selectedAntecedentes?.observacionesGenerales && (
                    <p className="text-sm text-muted-foreground">{selectedAntecedentes.observacionesGenerales}</p>
                  )}
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => openAntDrawer('generales')}
                      className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                      <Plus className="h-4 w-4" />
                      Editar generales
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
                  Selecciona un paciente para abrir su resumen general de antecedentes.
                </div>
              )}
            </DashboardPanel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardPanel
              title="Alergias"
              subtitle="Registro rapido de sensibilidades relevantes para la consulta."
              action={puedeEditar && selectedPet ? (
                <button type="button" onClick={() => openAntDrawer('alergia')} className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" />Agregar
                </button>
              ) : null}
            >
              <DataTable
                title="Listado de alergias"
                subtitle="Resumen clinico visible para el equipo."
                rows={alergiasRows}
                columns={[
                  { key: 'tipo', label: 'Tipo' },
                  { key: 'descripcion', label: 'Descripcion' },
                  { key: 'reaccion', label: 'Reaccion' },
                  { key: 'fecha', label: 'Fecha' },
                ]}
                emptyTitle="Sin alergias registradas"
                emptyBody="Cuando registres una alergia aparecera aqui."
              />
            </DashboardPanel>

            <DashboardPanel
              title="Vacunas"
              subtitle="Registro de esquema aplicado y proximas dosis."
              action={puedeEditar && selectedPet ? (
                <button type="button" onClick={() => openAntDrawer('vacuna')} className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" />Agregar
                </button>
              ) : null}
            >
              <DataTable
                title="Vacunas registradas"
                subtitle="Seguimiento rapido del plan preventivo."
                rows={vacunasRows}
                columns={[
                  { key: 'nombre', label: 'Vacuna' },
                  { key: 'fecha', label: 'Aplicacion' },
                  { key: 'proximaDosis', label: 'Proxima dosis' },
                  { key: 'lote', label: 'Lote' },
                ]}
                emptyTitle="Sin vacunas registradas"
                emptyBody="Cuando registres una vacuna aparecera aqui."
              />
            </DashboardPanel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <DashboardPanel
              title="Cirugias"
              subtitle="Procedimientos previos para dar contexto a la consulta."
              action={puedeEditar && selectedPet ? (
                <button type="button" onClick={() => openAntDrawer('cirugia')} className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" />Agregar
                </button>
              ) : null}
            >
              <DataTable
                title="Cirugias registradas"
                subtitle="Base quirurgica del paciente."
                rows={cirugiasRows}
                columns={[
                  { key: 'nombre', label: 'Cirugia' },
                  { key: 'fecha', label: 'Fecha' },
                  { key: 'veterinario', label: 'Profesional' },
                  { key: 'observaciones', label: 'Observaciones' },
                ]}
                emptyTitle="Sin cirugias registradas"
                emptyBody="Cuando registres una cirugia aparecera aqui."
              />
            </DashboardPanel>

            <DashboardPanel
              title="Condiciones cronicas"
              subtitle="Problemas persistentes que condicionan la atencion del paciente."
              action={puedeEditar && selectedPet ? (
                <button type="button" onClick={() => openAntDrawer('condicion')} className="inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
                  <Plus className="h-3.5 w-3.5" />Agregar
                </button>
              ) : null}
            >
              <DataTable
                title="Condiciones registradas"
                subtitle="Seguimiento clinico permanente."
                rows={condicionesRows}
                columns={[
                  { key: 'nombre', label: 'Condicion' },
                  { key: 'fechaDiagnostico', label: 'Diagnostico' },
                  { key: 'tratamientoActual', label: 'Tratamiento actual' },
                ]}
                emptyTitle="Sin condiciones cronicas"
                emptyBody="Cuando registres una condicion cronica aparecera aqui."
              />
            </DashboardPanel>
          </div>
          </div>
          )}

        </div>
      )}

      {/* ── Drawer: Antecedentes ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${antDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setAntDrawerOpen(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[480px] sm:border-l sm:border-border ${antDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
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
    </AdminShell>
  )
}
