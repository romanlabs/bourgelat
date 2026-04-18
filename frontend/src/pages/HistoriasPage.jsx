import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Lock, Plus, Search, ShieldCheck, Stethoscope } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatLongDate, formatNumber, getCurrentMonthRange } from '@/features/dashboard/dashboardUtils'
import { agendaApi } from '@/features/agenda/agendaApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const BLOCK_OPTIONS = [
  { value: 'todos', label: 'Todas' },
  { value: 'false', label: 'Editables' },
  { value: 'true', label: 'Bloqueadas' },
]

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
  'Cada 8 horas',
  'Cada 12 horas',
  'Cada 24 horas',
  'Dosis unica',
  'Segun necesidad',
]

const MEDICATION_DURATION_SUGGESTIONS = ['3 dias', '5 dias', '7 dias', '10 dias', '14 dias']

const createMedicationId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

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

const createDefaultForm = () => ({
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
  indicaciones: '',
  proximaConsulta: '',
  citaId: '',
  veterinarioId: '',
})

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const normalizeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const medicationHasAnyValue = (item) =>
  [item?.nombre, item?.concentracion, item?.dosis, item?.via, item?.frecuencia, item?.duracion, item?.cantidad, item?.indicacion]
    .some((value) => String(value || '').trim().length > 0)

const mapMedicamentosToDrafts = (medicamentos) => {
  if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
    return [createMedicationDraft()]
  }

  const drafts = medicamentos
    .map((item) => {
      if (typeof item === 'string') {
        return createMedicationDraft({ nombre: item })
      }

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
          cantidad:
            item.cantidad === undefined || item.cantidad === null || item.cantidad === ''
              ? ''
              : String(item.cantidad),
          indicacion: item.indicacion || item.instrucciones || '',
        })
      }

      return null
    })
    .filter(Boolean)

  return drafts.length > 0 ? drafts : [createMedicationDraft()]
}

const mapHistoriaToForm = (historia) => ({
  motivoConsulta: historia?.motivoConsulta || '',
  anamnesis: historia?.anamnesis || '',
  peso: historia?.peso ? String(historia.peso) : '',
  temperatura: historia?.temperatura ? String(historia.temperatura) : '',
  frecuenciaCardiaca: historia?.frecuenciaCardiaca ? String(historia.frecuenciaCardiaca) : '',
  frecuenciaRespiratoria: historia?.frecuenciaRespiratoria
    ? String(historia.frecuenciaRespiratoria)
    : '',
  condicionCorporal: historia?.condicionCorporal ? String(historia.condicionCorporal) : '',
  mucosas: historia?.mucosas || '',
  estadoHidratacion: historia?.estadoHidratacion || '',
  examenFisicoDetalle: historia?.examenFisicoDetalle || '',
  diagnostico: historia?.diagnostico || '',
  diagnosticoPresuntivo: historia?.diagnosticoPresuntivo || '',
  tratamiento: historia?.tratamiento || '',
  medicamentos: mapMedicamentosToDrafts(historia?.medicamentos),
  indicaciones: historia?.indicaciones || '',
  proximaConsulta: historia?.proximaConsulta || '',
  citaId: historia?.citaId || '',
  veterinarioId: historia?.veterinarioId || '',
})

const buildHistoryStatusTone = (bloqueada) =>
  bloqueada
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

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

function RestrictedHistoriasPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Historias clinicas"
          subtitle="Este modulo se muestra a veterinarios, auxiliares o administracion autorizada."
        >
          <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
            Tu acceso actual no tiene visibilidad sobre la historia clinica. Solicita permisos al
            administrador o al medico responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function HistoriasPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()

  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const [pagina, setPagina] = useState(1)
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [bloqueada, setBloqueada] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState(rangoMes.fechaInicio)
  const [fechaFin, setFechaFin] = useState(rangoMes.fechaFin)
  const [petSearch, setPetSearch] = useState('')
  const [medicationSearch, setMedicationSearch] = useState('')
  const [selectedPet, setSelectedPet] = useState(null)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [form, setForm] = useState(() => createDefaultForm())
  const medicationSearchDeferred = useDeferredValue(medicationSearch.trim())

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario', 'auxiliar'])
  const featureSet = new Set(
    Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  )
  const puedeVerHistorias = featureSet.has('historias')
  const puedeEditarHistorias = hasAnyRole(usuario, ['admin', 'superadmin', 'veterinario'])
  const puedeConsultarInventarioClinico = featureSet.has('inventario')

  useEffect(() => {
    document.title = 'Historias clinicas | Bourgelat'
  }, [])

  const historiasQuery = useQuery({
    queryKey: [
      'historias-listado',
      selectedPet?.id || 'todas',
      veterinarioId,
      bloqueada,
      fechaInicio,
      fechaFin,
      pagina,
    ],
    queryFn: () =>
      historiasApi.obtenerHistorias({
        mascotaId: selectedPet?.id,
        veterinarioId: veterinarioId !== 'todos' ? veterinarioId : undefined,
        bloqueada: bloqueada !== 'todos' ? bloqueada : undefined,
        fechaInicio,
        fechaFin,
        pagina,
        limite: 12,
      }),
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['historias-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const mascotasQuery = useQuery({
    queryKey: ['historias-mascotas-selector', petSearch.trim()],
    queryFn: () =>
      pacientesApi.obtenerMascotas({
        buscar: petSearch.trim() || undefined,
        pagina: 1,
        limite: 8,
      }),
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const citasRelacionadasQuery = useQuery({
    queryKey: ['historias-citas-relacionadas', selectedPet?.id || null],
    queryFn: () =>
      agendaApi.obtenerCitas({
        mascotaId: selectedPet?.id,
        pagina: 1,
        limite: 12,
      }),
    enabled: rolPermitido && puedeVerHistorias && Boolean(selectedPet?.id),
    placeholderData: (previousData) => previousData,
  })

  const catalogoMedicamentosQuery = useQuery({
    queryKey: ['historias-catalogo-medicamentos', medicationSearchDeferred],
    queryFn: () =>
      inventarioApi.obtenerCatalogoMedicamentos({
        buscar: medicationSearchDeferred || undefined,
        limite: 6,
      }),
    enabled:
      rolPermitido &&
      puedeVerHistorias &&
      puedeEditarHistorias &&
      puedeConsultarInventarioClinico,
    placeholderData: (previousData) => previousData,
  })

  const crearHistoriaMutation = useMutation({
    mutationFn: historiasApi.crearHistoria,
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica registrada exitosamente')
      setSelectedHistory(data?.historia || null)
      setForm(createDefaultForm())
      queryClient.invalidateQueries({ queryKey: ['historias-listado'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar la historia clinica.'))
    },
  })

  const editarHistoriaMutation = useMutation({
    mutationFn: ({ historiaId, payload }) => historiasApi.editarHistoria(historiaId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica actualizada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['historias-listado'] })
      if (selectedHistory?.id) {
        loadHistory(selectedHistory.id)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la historia clinica.'))
    },
  })

  const bloquearHistoriaMutation = useMutation({
    mutationFn: historiasApi.bloquearHistoria,
    onSuccess: (data) => {
      toast.success(data?.message || 'Historia clinica bloqueada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['historias-listado'] })
      if (selectedHistory?.id) {
        loadHistory(selectedHistory.id)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible bloquear la historia clinica.'))
    },
  })

  const veterinarios = veterinariosQuery.data?.usuarios || []
  const mascotas = mascotasQuery.data?.mascotas || []
  const historias = historiasQuery.data?.historias || []
  const citasRelacionadas = citasRelacionadasQuery.data?.citas || []
  const medicamentosCatalogo = catalogoMedicamentosQuery.data?.productos || []
  const preferredVetId =
    veterinarios.find((item) => item.id === usuario?.id)?.id || veterinarios[0]?.id || ''

  const historiasRows = historias.map((historia) => ({
    id: historia.id,
    fecha: new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(historia.fechaConsulta)),
    paciente: historia.mascota?.nombre || 'Paciente',
    tutor: historia.propietario?.nombre || 'Sin tutor',
    profesional: historia.veterinario?.nombre || 'Sin profesional',
    diagnostico: historia.diagnostico,
    proximaConsulta: historia.proximaConsulta ? formatLongDate(historia.proximaConsulta) : 'Sin control',
    bloqueada: historia.bloqueada,
    raw: historia,
  }))

  const historiasBloqueadas = historias.filter((item) => item.bloqueada).length
  const conControl = historias.filter((item) => item.proximaConsulta).length
  const profesionalesActivos = new Set(
    historias.map((item) => item.veterinario?.id).filter(Boolean)
  ).size

  const statusData = [
    {
      key: 'editables',
      name: 'Editables',
      value: historias.length - historiasBloqueadas,
      color: '#0f766e',
    },
    { key: 'bloqueadas', name: 'Bloqueadas', value: historiasBloqueadas, color: '#f59e0b' },
  ]

  const loadHistory = async (historiaId) => {
    try {
      const data = await historiasApi.obtenerHistoria(historiaId)
      const historia = data?.historia
      setSelectedHistory(historia || null)
      setForm(mapHistoriaToForm(historia))
      if (historia?.mascota && historia?.propietario) {
        setSelectedPet({
          ...historia.mascota,
          Propietario: historia.propietario,
        })
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No fue posible cargar el detalle de la historia clinica.'))
    }
  }

  const resetForm = () => {
    setSelectedHistory(null)
    setForm(createDefaultForm())
  }

  const handleSelectPet = (pet) => {
    setSelectedPet(pet)
    setSelectedHistory(null)
    setForm(createDefaultForm())
    setPagina(1)
  }

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
      indicaciones: form.indicaciones.trim() || undefined,
      proximaConsulta: form.proximaConsulta || undefined,
      citaId: form.citaId || undefined,
      mascotaId: selectedPet?.id,
      propietarioId: selectedPet?.Propietario?.id,
      veterinarioId: form.veterinarioId || preferredVetId,
    }
  }

  const updateMedicationDraft = (draftId, field, value) => {
    setForm((current) => ({
      ...current,
      medicamentos: current.medicamentos.map((item) =>
        item.id === draftId ? { ...item, [field]: value } : item
      ),
    }))
  }

  const addMedicationDraft = () => {
    setForm((current) => ({
      ...current,
      medicamentos: [...current.medicamentos, createMedicationDraft()],
    }))
  }

  const removeMedicationDraft = (draftId) => {
    setForm((current) => {
      const nextItems = current.medicamentos.filter((item) => item.id !== draftId)

      return {
        ...current,
        medicamentos: nextItems.length > 0 ? nextItems : [createMedicationDraft()],
      }
    })
  }

  const addMedicationFromInventory = (producto) => {
    const draft = createMedicationDraft({
      productoId: producto.id,
      fuente: 'inventario',
      nombre: producto.nombre || '',
      concentracion: producto.presentacionReferencia || '',
      cantidad: '1',
      indicacion: producto.requiereFormula
        ? 'Dispensar segun indicacion medica registrada en la historia.'
        : '',
    })

    setForm((current) => {
      const firstEmptyIndex = current.medicamentos.findIndex(
        (item) => !medicationHasAnyValue(item)
      )

      if (firstEmptyIndex >= 0) {
        return {
          ...current,
          medicamentos: current.medicamentos.map((item, index) =>
            index === firstEmptyIndex ? draft : item
          ),
        }
      }

      return {
        ...current,
        medicamentos: [...current.medicamentos, draft],
      }
    })
  }

  const applyMedicationSuggestion = (draftId, field, value) => {
    updateMedicationDraft(draftId, field, value)
  }

  const medicationSummaryItems = form.medicamentos
    .filter((item) => medicationHasAnyValue(item) && item.nombre.trim())
    .map((item) => ({
      id: item.id,
      title: item.nombre.trim(),
      meta: [item.concentracion, item.dosis, item.via, item.frecuencia, item.duracion]
        .filter(Boolean)
        .join(' | '),
      source: item.fuente === 'inventario' ? 'Catalogo interno' : '',
      quantity:
        item.cantidad !== '' && item.cantidad !== null && item.cantidad !== undefined
          ? `Cantidad formulada: ${item.cantidad}`
          : '',
      instructions: item.indicacion.trim(),
    }))

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!selectedPet?.id || !selectedPet?.Propietario?.id) {
      toast.error('Selecciona primero un paciente activo para abrir la historia clinica.')
      return
    }

    const payload = buildPayload()

    const medicamentoIncompleto = form.medicamentos.find(
      (item) => medicationHasAnyValue(item) && !item.nombre.trim()
    )

    if (medicamentoIncompleto) {
      toast.error('Cada medicamento diligenciado debe tener al menos el nombre del producto.')
      return
    }

    if (!payload.motivoConsulta || !payload.diagnostico || !payload.tratamiento || !payload.veterinarioId) {
      toast.error('Completa motivo de consulta, diagnostico, tratamiento y profesional responsable.')
      return
    }

    if (selectedHistory?.id) {
      editarHistoriaMutation.mutate({ historiaId: selectedHistory.id, payload })
      return
    }

    crearHistoriaMutation.mutate(payload)
  }

  if (!rolPermitido) {
    return <RestrictedHistoriasPage />
  }

  return (
    <AdminShell
      currentKey="historias"
      title="Historias clinicas"
      description="Modulo clinico para documentar consultas, examen fisico, diagnostico y plan terapeutico con trazabilidad real sobre el paciente."
      headerBadge={
        <StatusPill tone="border-rose-200 bg-rose-50 text-rose-700">
          Consulta documentada
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/antecedentes"
            className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir antecedentes
          </Link>
          <Link
            to="/pacientes"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir pacientes
          </Link>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir agenda
          </Link>
        </div>
      }
      asideNote="Este modulo sirve para consulta veterinaria real: deja constancia de lo evaluado, el diagnostico, el tratamiento y el control futuro."
    >
      {!puedeVerHistorias ? (
        <EmptyModuleState
          title="Historias clinicas no disponibles en el plan actual"
          body="La consulta medica y su trazabilidad dependen de la funcionalidad de historias clinicas. Si no aparece activa, conviene revisar el plan de la clinica."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {historiasQuery.isError || veterinariosQuery.isError ? (
            <div className="grid gap-4">
              {historiasQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(historiasQuery.error, 'No fue posible cargar el listado de historias clinicas.')}
                </div>
              ) : null}
              {veterinariosQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(veterinariosQuery.error, 'No fue posible cargar el equipo veterinario.')}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={FileText}
              label="Historias visibles"
              value={formatNumber(historiasQuery.data?.total || 0)}
              helper="Total dentro del filtro activo del modulo."
              tone="text-cyan-700"
            />
            <KpiCard
              icon={Lock}
              label="Bloqueadas"
              value={formatNumber(historiasBloqueadas)}
              helper="Consultas que ya no admiten modificaciones."
              tone="text-amber-700"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Con control"
              value={formatNumber(conControl)}
              helper="Historias visibles con proxima consulta programada."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={Stethoscope}
              label="Profesionales"
              value={formatNumber(profesionalesActivos)}
              helper="Medicos que aparecen en la muestra visible."
              tone="text-violet-700"
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <DonutCard
              title="Estado de documentacion"
              subtitle="Balance entre historias editables y bloqueadas dentro del filtro activo."
              data={statusData}
              centerLabel="Historias"
              centerValue={formatNumber(historias.length)}
              formatter={formatNumber}
              emptyMessage="Aun no hay historias para mostrar."
            />

            <DashboardPanel
              title="Listado clinico"
              subtitle="Consulta recientes por paciente, profesional, periodo y estado de bloqueo."
              action={
                <div className="flex flex-wrap gap-3">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(event) => {
                      setFechaInicio(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(event) => {
                      setFechaFin(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <select
                    value={veterinarioId}
                    onChange={(event) => {
                      setVeterinarioId(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    <option value="todos">Todos los medicos</option>
                    {veterinarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bloqueada}
                    onChange={(event) => {
                      setBloqueada(event.target.value)
                      setPagina(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {BLOCK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <DataTable
                title="Historias"
                subtitle="Vista administrativa y clinica de las consultas documentadas."
                rows={historiasRows}
                columns={[
                  { key: 'fecha', label: 'Fecha' },
                  { key: 'paciente', label: 'Paciente' },
                  { key: 'tutor', label: 'Tutor' },
                  { key: 'profesional', label: 'Profesional' },
                  { key: 'proximaConsulta', label: 'Control' },
                  {
                    key: 'bloqueada',
                    label: 'Estado',
                    render: (row) => (
                      <StatusPill tone={buildHistoryStatusTone(row.bloqueada)}>
                        {row.bloqueada ? 'Bloqueada' : 'Editable'}
                      </StatusPill>
                    ),
                  },
                  {
                    key: 'accion',
                    label: 'Detalle',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => loadHistory(row.id)}
                        className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Ver
                      </button>
                    ),
                  },
                ]}
                emptyTitle="No hay historias para este filtro"
                emptyBody="Ajusta el periodo, el profesional o el paciente para encontrar una consulta existente."
                action={
                  selectedPet ? (
                    <StatusPill tone="border-cyan-200 bg-cyan-50 text-cyan-700">
                      {selectedPet.nombre}
                    </StatusPill>
                  ) : null
                }
              />

              {(historiasQuery.data?.paginas || 1) > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Pagina {historiasQuery.data?.paginaActual || 1} de {historiasQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPagina((current) => Math.max(current - 1, 1))}
                      disabled={(historiasQuery.data?.paginaActual || 1) <= 1}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPagina((current) =>
                          Math.min(current + 1, historiasQuery.data?.paginas || 1)
                        )
                      }
                      disabled={(historiasQuery.data?.paginaActual || 1) >= (historiasQuery.data?.paginas || 1)}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <DashboardPanel
              title="Paciente para consulta"
              subtitle="Selecciona el paciente activo antes de registrar o revisar la evolucion."
              action={<Search className="h-4 w-4 text-cyan-700" />}
            >
              <input
                type="text"
                value={petSearch}
                onChange={(event) => setPetSearch(event.target.value)}
                placeholder="Buscar por nombre o microchip"
                className="h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
              />

              <div className="mt-4 space-y-2">
                {selectedPet ? (
                  <div className="border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">{selectedPet.nombre}</p>
                    <p className="mt-1">
                      {selectedPet.Propietario?.nombre || 'Sin tutor principal'} · {selectedPet.especie}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPet(null)
                        resetForm()
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
                      className="flex w-full items-start justify-between border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{pet.nombre}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {pet.Propietario?.nombre || 'Sin tutor principal'}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Seleccionar
                      </span>
                    </button>
                  ))}
              </div>

              {selectedHistory ? (
                <div className="mt-5 border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-600">
                  <p className="font-semibold text-slate-950">Detalle cargado</p>
                  <p className="mt-1">{selectedHistory.veterinario?.nombre || 'Sin profesional'}</p>
                  <p>{formatClinicalDateTime(selectedHistory.fechaConsulta)}</p>
                  <div className="mt-3">
                    <StatusPill tone={buildHistoryStatusTone(selectedHistory.bloqueada)}>
                      {selectedHistory.bloqueada ? 'Bloqueada' : 'Editable'}
                    </StatusPill>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>

            <DashboardPanel
              title={selectedHistory ? 'Editar historia clinica' : 'Nueva historia clinica'}
              subtitle="Documenta la consulta con los datos clinicos que de verdad sirven para seguimiento y trazabilidad."
              action={
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Nueva
                </button>
              }
            >
              {!puedeEditarHistorias ? (
                <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                  Tu rol actual puede consultar historias, pero no crear ni modificar consultas clinicas.
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={form.veterinarioId || preferredVetId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, veterinarioId: event.target.value }))
                      }
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      <option value="">Selecciona el profesional</option>
                      {veterinarios.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                    <select
                      value={form.citaId}
                      onChange={(event) => setForm((current) => ({ ...current, citaId: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      <option value="">Sin cita relacionada</option>
                      {citasRelacionadas.map((cita) => (
                        <option key={cita.id} value={cita.id}>
                          {`${cita.fecha} · ${cita.horaInicio?.slice(0, 5)} · ${cita.motivo}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={form.motivoConsulta}
                    onChange={(event) => setForm((current) => ({ ...current, motivoConsulta: event.target.value }))}
                    placeholder="Motivo principal de consulta"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <textarea
                    value={form.anamnesis}
                    onChange={(event) => setForm((current) => ({ ...current, anamnesis: event.target.value }))}
                    placeholder="Anamnesis y relato del tutor"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />

                  <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                    Registra signos vitales y examen basico con nombres completos para evitar ambiguedades:
                    frecuencia cardiaca en latidos por minuto, frecuencia respiratoria en respiraciones por minuto y condicion corporal en escala de 1 a 5.
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.peso}
                      onChange={(event) => setForm((current) => ({ ...current, peso: event.target.value }))}
                      placeholder="Peso"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      value={form.temperatura}
                      onChange={(event) => setForm((current) => ({ ...current, temperatura: event.target.value }))}
                      placeholder="Temperatura °C"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.frecuenciaCardiaca}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, frecuenciaCardiaca: event.target.value }))
                      }
                      placeholder="Frecuencia cardiaca (lpm)"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={form.frecuenciaRespiratoria}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          frecuenciaRespiratoria: event.target.value,
                        }))
                      }
                      placeholder="Frecuencia respiratoria (rpm)"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={form.condicionCorporal}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, condicionCorporal: event.target.value }))
                      }
                      placeholder="Condicion corporal (1-5)"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      value={form.mucosas}
                      onChange={(event) => setForm((current) => ({ ...current, mucosas: event.target.value }))}
                      placeholder="Mucosas"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>

                  <select
                    value={form.estadoHidratacion}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, estadoHidratacion: event.target.value }))
                    }
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {HYDRATION_OPTIONS.map((option) => (
                      <option key={option.value || 'default'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={form.examenFisicoDetalle}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, examenFisicoDetalle: event.target.value }))
                    }
                    placeholder="Examen fisico y hallazgos relevantes"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <textarea
                    value={form.diagnostico}
                    onChange={(event) => setForm((current) => ({ ...current, diagnostico: event.target.value }))}
                    placeholder="Diagnostico principal"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <textarea
                    value={form.diagnosticoPresuntivo}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, diagnosticoPresuntivo: event.target.value }))
                    }
                    placeholder="Diagnostico presuntivo o diferencial"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <textarea
                    value={form.tratamiento}
                    onChange={(event) => setForm((current) => ({ ...current, tratamiento: event.target.value }))}
                    placeholder="Tratamiento instaurado"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <div className="grid gap-4 border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Plan farmacologico</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Registra la formulacion como lo hace un software clinico serio: producto,
                          concentracion, dosis, via, frecuencia, duracion, cantidad dispensada e
                          instrucciones claras para el tutor.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addMedicationDraft}
                        className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar medicamento
                      </button>
                    </div>

                    <div className="grid gap-4">
                      {puedeConsultarInventarioClinico ? (
                        <div className="grid gap-3 border border-dashed border-slate-300 bg-slate-100 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Traer desde inventario clinico
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                Busca medicamentos con stock disponible y llévalos a la formulación
                                sin volver a digitarlos.
                              </p>
                            </div>
                            <label className="relative min-w-[260px]">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={medicationSearch}
                                onChange={(event) => setMedicationSearch(event.target.value)}
                                placeholder="Buscar medicamento, laboratorio o presentacion"
                                className="h-11 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-2">
                            {medicamentosCatalogo.length ? (
                              medicamentosCatalogo.map((producto) => (
                                <div
                                  key={producto.id}
                                  className="flex items-start justify-between gap-3 border border-slate-200 bg-white px-4 py-4"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {producto.nombre}
                                    </p>
                                    {producto.presentacionReferencia ? (
                                      <p className="mt-1 text-sm text-slate-600">
                                        {producto.presentacionReferencia}
                                      </p>
                                    ) : null}
                                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                                      Stock {formatNumber(producto.stock)} disponible
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addMedicationFromInventory(producto)}
                                    className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Usar
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="border border-slate-200 bg-white px-4 py-5 text-sm leading-7 text-slate-600 xl:col-span-2">
                                No hay medicamentos disponibles para esta búsqueda dentro del
                                inventario activo.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {form.medicamentos.map((item, index) => (
                        <div key={item.id} className="grid gap-4 border border-slate-200 bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Medicamento {index + 1}
                              </p>
                              {item.fuente === 'inventario' ? (
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                                  Vinculado a inventario interno
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedicationDraft(item.id)}
                              className="text-sm font-semibold text-rose-700 hover:text-rose-800"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Medicamento
                              </span>
                              <input
                                type="text"
                                value={item.nombre}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'nombre', event.target.value)
                                }
                                placeholder="Ej. Meloxicam"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Concentracion o presentacion
                              </span>
                              <input
                                type="text"
                                value={item.concentracion}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'concentracion', event.target.value)
                                }
                                placeholder="Ej. Suspension oral 1.5 mg/ml"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Dosis
                              </span>
                              <input
                                type="text"
                                value={item.dosis}
                                onChange={(event) => updateMedicationDraft(item.id, 'dosis', event.target.value)}
                                placeholder="Ej. 0.1 mg/kg"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Via
                              </span>
                              <select
                                value={item.via}
                                onChange={(event) => updateMedicationDraft(item.id, 'via', event.target.value)}
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              >
                                {MEDICATION_ROUTE_OPTIONS.map((option) => (
                                  <option key={option.value || 'default'} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Frecuencia
                              </span>
                              <input
                                type="text"
                                value={item.frecuencia}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'frecuencia', event.target.value)
                                }
                                placeholder="Ej. Cada 24 horas"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Duracion
                              </span>
                              <input
                                type="text"
                                value={item.duracion}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'duracion', event.target.value)
                                }
                                placeholder="Ej. 5 dias"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-2">
                            <div className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Atajos de frecuencia
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {MEDICATION_FREQUENCY_SUGGESTIONS.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => applyMedicationSuggestion(item.id, 'frecuencia', option)}
                                    className={`border px-3 py-1.5 text-xs font-semibold transition ${
                                      item.frecuencia === option
                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Atajos de duracion
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {MEDICATION_DURATION_SUGGESTIONS.map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => applyMedicationSuggestion(item.id, 'duracion', option)}
                                    className={`border px-3 py-1.5 text-xs font-semibold transition ${
                                      item.duracion === option
                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Cantidad dispensada
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.cantidad}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'cantidad', event.target.value)
                                }
                                placeholder="Ej. 10"
                                className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Instrucciones
                              </span>
                              <textarea
                                value={item.indicacion}
                                onChange={(event) =>
                                  updateMedicationDraft(item.id, 'indicacion', event.target.value)
                                }
                                placeholder="Ej. Administrar despues de comer y completar el esquema indicado."
                                className="min-h-[96px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {medicationSummaryItems.length > 0 ? (
                      <div className="grid gap-3 border border-dashed border-slate-300 bg-slate-100 px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Resumen de formulacion
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Asi se vera la receta clinica que estas dejando documentada para el
                            seguimiento del paciente.
                          </p>
                        </div>
                        <div className="grid gap-3">
                          {medicationSummaryItems.map((item) => (
                            <div
                              key={item.id}
                              className="border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700"
                            >
                              <p className="font-semibold text-slate-950">{item.title}</p>
                              {item.source ? (
                                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                                  {item.source}
                                </p>
                              ) : null}
                              {item.meta ? <p className="mt-1">{item.meta}</p> : null}
                              {item.quantity ? <p>{item.quantity}</p> : null}
                              {item.instructions ? <p>{item.instructions}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    value={form.indicaciones}
                    onChange={(event) => setForm((current) => ({ ...current, indicaciones: event.target.value }))}
                    placeholder="Indicaciones para el tutor"
                    className="min-h-[100px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <input
                    type="date"
                    value={form.proximaConsulta}
                    onChange={(event) => setForm((current) => ({ ...current, proximaConsulta: event.target.value }))}
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />

                  {selectedHistory?.bloqueada ? (
                    <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      Esta historia ya esta bloqueada. Puedes consultarla, pero no volver a editarla.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={
                        crearHistoriaMutation.isPending ||
                        editarHistoriaMutation.isPending ||
                        !selectedPet ||
                        selectedHistory?.bloqueada
                      }
                      className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectedHistory?.id
                        ? editarHistoriaMutation.isPending
                          ? 'Guardando...'
                          : 'Guardar cambios'
                        : crearHistoriaMutation.isPending
                          ? 'Guardando...'
                          : 'Registrar historia'}
                    </button>

                    {selectedHistory?.id ? (
                      <button
                        type="button"
                        onClick={() => bloquearHistoriaMutation.mutate(selectedHistory.id)}
                        disabled={bloquearHistoriaMutation.isPending || selectedHistory.bloqueada}
                        className="border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {bloquearHistoriaMutation.isPending ? 'Bloqueando...' : 'Bloquear historia'}
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </DashboardPanel>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
