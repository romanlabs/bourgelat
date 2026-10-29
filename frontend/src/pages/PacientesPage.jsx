import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DropdownMenu } from 'radix-ui'
import {
  ChevronDown,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatNumber, toNumber } from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { useSoloLectura } from '@/lib/useSoloLectura'
import { cn } from '@/lib/utils'
import PacienteDrawer from '@/features/pacientes/PacienteDrawer'
import TutorDrawer from '@/features/pacientes/TutorDrawer'
import { usePacientesResumen } from '@/features/pacientes/usePacientesResumen'
import { usePacientesMascotas, SPECIES_OPTIONS } from '@/features/pacientes/usePacientesMascotas'
import { useTutores } from '@/features/pacientes/useTutores'

const TABS = [
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'tutores', label: 'Tutores' },
]

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const BTN_PRIMARIO = `inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-[18px] text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`
const ITEM_MENU = 'flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted'

// Antecedentes, editar y desactivar en un menú «⋯»; «Abrir ficha» queda a la vista.
function AccionesPaciente({ nombre, antecedentesTo, onEditar, onCambiarEstado, reactivar }) {
  if (!antecedentesTo && !onEditar && !onCambiarEstado) return null
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${nombre}`}
          className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary', FOCO)}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-xl bg-popover p-1.5 shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          {antecedentesTo ? (
            <DropdownMenu.Item asChild className={ITEM_MENU}>
              <Link to={antecedentesTo}>Antecedentes</Link>
            </DropdownMenu.Item>
          ) : null}
          {onEditar ? (
            <DropdownMenu.Item onSelect={onEditar} className={ITEM_MENU}>
              Editar
            </DropdownMenu.Item>
          ) : null}
          {onCambiarEstado ? (
            <DropdownMenu.Item onSelect={onCambiarEstado} className={cn(ITEM_MENU, !reactivar && 'text-danger')}>
              {reactivar ? 'Reactivar' : 'Desactivar'}
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Color de la inicial según la especie: se distingue la lista de un vistazo.
const TONO_ESPECIE = {
  perro: 'bg-accent text-primary',
  gato: 'bg-brand-muted text-brand-foreground',
}
const tonoEspecie = (especie) => TONO_ESPECIE[especie] || 'bg-info-soft text-info'

const SEXO = { macho: 'Macho', hembra: 'Hembra' }

const iniciales = (nombre) =>
  String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')

function PetAvatar({ name, photo, especie, className = 'h-12 w-12 rounded-xl text-lg' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden font-bold',
        photo ? 'bg-muted' : tonoEspecie(especie),
        className
      )}
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        String(name || 'P').charAt(0).toUpperCase()
      )}
    </span>
  )
}

// Control segmentado: la opción activa en blanco sobre fondo suave.
function Segmentado({ label, options, value, onChange, size = 'h-9' }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-[10px] bg-secondary p-1">
      {options.map((option) => {
        const activa = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(option.value)}
            className={cn(
              size,
              'rounded-[7px] px-3.5 text-[13px] transition',
              FOCO,
              activa
                ? 'bg-card font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function Buscador({ value, onChange, placeholder, ariaLabel, cargando }) {
  return (
    <label className="flex h-12 min-w-0 flex-1 basis-80 items-center gap-2.5 rounded-[10px] border border-input bg-card px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
      <Search className="h-[18px] w-[18px] shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={120}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
      />
      {cargando ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
      ) : value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition hover:bg-muted hover:text-foreground ${FOCO}`}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </label>
  )
}

// Botón de filtro con menú de especies y su conteo; resaltado si hay una elegida.
// Solo lista las especies que la clínica atiende (y la elegida, aunque quede en 0).
function FiltroEspecie({ value, onChange, porEspecie, total }) {
  const activa = value !== 'todas'
  const elegida = SPECIES_OPTIONS.find((option) => option.value === value)
  const opciones = SPECIES_OPTIONS.filter(
    (option) => option.value === 'todas' || option.value === value || porEspecie[option.value] > 0
  )

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Filtrar por especie"
          className={cn(
            'flex h-12 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition active:translate-y-px data-[state=open]:bg-accent',
            FOCO,
            activa ? 'bg-accent text-primary' : 'bg-secondary text-secondary-foreground hover:brightness-95'
          )}
        >
          <ListFilter className="h-[18px] w-[18px]" />
          {activa ? elegida?.label : 'Especie'}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-60 rounded-xl bg-popover p-1.5 shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {opciones.map((option) => {
            const conteo = option.value === 'todas' ? total : porEspecie[option.value] || 0
            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => onChange(option.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                  option.value === value && 'bg-accent font-semibold'
                )}
              >
                {option.value === 'todas' ? 'Todas' : option.label}
                <span className="text-[13px] tabular-nums text-muted-foreground">{formatNumber(conteo)}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function FiltroDesactivados({ checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'h-11 rounded-lg px-3.5 text-sm font-semibold transition active:translate-y-px',
        FOCO,
        checked ? 'bg-warning-soft text-warning' : 'bg-secondary text-secondary-foreground hover:brightness-95'
      )}
    >
      {checked ? 'Viendo desactivados' : 'Ver desactivados'}
    </button>
  )
}

function PiePaginacion({ pagina, paginas, onChange, total, etiqueta }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted px-5 py-4">
      <span className="text-sm text-muted-foreground">
        {typeof total === 'number' ? `${formatNumber(total)} ${etiqueta}` : ''}
        {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ''}
      </span>
      {paginas > 1 ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange(Math.max(pagina - 1, 1))}
            disabled={pagina <= 1}
            className={`h-10 rounded-lg bg-card px-3.5 text-sm font-semibold text-foreground transition hover:bg-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(pagina + 1, paginas))}
            disabled={pagina >= paginas}
            className={`h-10 rounded-lg bg-card px-3.5 text-sm font-semibold text-foreground transition hover:bg-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${FOCO}`}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ListaVacia({ titulo, cuerpo }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{titulo}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{cuerpo}</p>
    </div>
  )
}

function FilasSkeleton({ rows = 6 }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-3">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="hidden h-4 w-32 rounded bg-muted sm:block" />
        </div>
      ))}
    </div>
  )
}

export default function PacientesPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() =>
    TABS.some((tab) => tab.id === tabParam) ? tabParam : 'pacientes'
  )

  // La pestaña sigue al ?tab= cuando cambia (ajuste en render, no en efecto).
  const [tabParamPrevio, setTabParamPrevio] = useState(tabParam)
  if (tabParam !== tabParamPrevio) {
    setTabParamPrevio(tabParam)
    if (TABS.some((tab) => tab.id === tabParam)) setActiveTab(tabParam)
  }

  const rolPermitido = canAccessModule(usuario, 'pacientes')
  // Todos los planes incluyen pacientes, propietarios e historias.
  const puedeVerModulo = true
  // Mismos roles que aceptan el POST y el PUT del backend en cada entidad.
  const puedeGestionarTutor = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar'])
  const puedeGestionarPaciente = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])
  // Desactivar/reactivar pacientes: solo administración (igual que el backend).
  const puedeDesactivarPaciente = hasAnyRole(usuario, ['admin', 'superadmin'])
  const [pacienteADesactivar, setPacienteADesactivar] = useState(null)
  const [tutorADesactivar, setTutorADesactivar] = useState(null)
  // Tutor abierto en el panel de detalle (solo presentación).
  const [tutorSeleccionadoId, setTutorSeleccionadoId] = useState(null)
  const { propsAccion } = useSoloLectura()

  const enabled = rolPermitido && puedeVerModulo

  const resumenHook = usePacientesResumen({ enabled })
  const mascotasHook = usePacientesMascotas({ enabled })
  const tutoresHook = useTutores({ enabled })

  // "Nuevo paciente" del menu rapido llega con ?nuevo=paciente: abre el
  // formulario directo y limpia el parametro para no reabrirlo al volver.
  const abrirNuevoPaciente = mascotasHook.openCreateDrawer
  const pideNuevoPaciente = searchParams.get('nuevo') === 'paciente'
  useEffect(() => {
    if (!pideNuevoPaciente) return
    if (puedeGestionarPaciente && !propsAccion.disabled) abrirNuevoPaciente()
    setSearchParams({ tab: 'pacientes' }, { replace: true })
  }, [pideNuevoPaciente, puedeGestionarPaciente, propsAccion.disabled, abrirNuevoPaciente, setSearchParams])

  const limiteMascotas = toNumber(suscripcion?.limiteMascotas)

  useEffect(() => {
    document.title = 'Pacientes | Bourgelat'
  }, [])

  if (!rolPermitido) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="rounded-2xl bg-card px-6 py-5 text-[15px] leading-6 text-muted-foreground">
            Tu acceso actual no permite ver los pacientes ni los tutores de la clínica.
          </div>
        </div>
      </div>
    )
  }

  const totalesListos = !resumenHook.mascotasResumenQuery.isPending && !resumenHook.propietariosResumenQuery.isPending
  const totalMascotas = resumenHook.totalMascotas
  const totalTutores = resumenHook.totalPropietarios
  const titulo = !totalesListos
    ? 'Pacientes'
    : activeTab === 'tutores'
      ? `${formatNumber(totalTutores)} ${totalTutores === 1 ? 'tutor' : 'tutores'}`
      : `${formatNumber(totalMascotas)} ${totalMascotas === 1 ? 'paciente' : 'pacientes'}`
  const descripcion = !totalesListos
    ? 'Tutores y pacientes de la clínica.'
    : activeTab === 'tutores'
      ? `Con ${formatNumber(totalMascotas)} ${totalMascotas === 1 ? 'paciente registrado' : 'pacientes registrados'}`
      : `De ${formatNumber(totalTutores)} ${totalTutores === 1 ? 'tutor' : 'tutores'}${
          limiteMascotas === null ? '' : ` · ${formatNumber(Math.max(limiteMascotas - totalMascotas, 0))} cupos libres en el plan`
        }`

  const tutoresRows = tutoresHook.tutoresRows
  const tutorSeleccionado =
    tutoresRows.find((row) => row.id === tutorSeleccionadoId) || tutoresRows[0] || null

  const botonNuevo =
    activeTab === 'tutores' ? (
      puedeGestionarTutor ? (
        <button type="button" onClick={tutoresHook.openCreateDrawer} {...propsAccion} className={BTN_PRIMARIO}>
          <UserRound className="h-4 w-4" />
          Nuevo tutor
        </button>
      ) : null
    ) : puedeGestionarPaciente ? (
      <button type="button" onClick={mascotasHook.openCreateDrawer} {...propsAccion} className={BTN_PRIMARIO}>
        <Plus className="h-4 w-4" />
        Nuevo paciente
      </button>
    ) : null

  return (
    <AdminShell
      currentKey="pacientes"
      title={titulo}
      description={descripcion}
      hideSearch
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmentado
            label="Ver"
            options={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={activeTab}
            onChange={setActiveTab}
          />
          {botonNuevo}
        </div>
      }
    >
      {!puedeVerModulo ? (
        <EmptyState
          icon={<Sparkles />}
          title="Pacientes no disponibles en el plan actual"
          description="La base de tutores y pacientes hace parte del trabajo diario. Si esta sección no aparece activa, revisa el plan contratado por la clínica."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Vista: Pacientes */}
          {activeTab === 'pacientes' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Buscador
                  value={mascotasHook.buscar}
                  onChange={mascotasHook.setBuscar}
                  placeholder="Nombre, raza o tutor"
                  ariaLabel="Buscar paciente"
                  cargando={mascotasHook.mascotasQuery.isFetching}
                />
                <FiltroEspecie
                  value={mascotasHook.especie}
                  onChange={mascotasHook.setEspecie}
                  porEspecie={resumenHook.porEspecie}
                  total={totalMascotas}
                />
                {puedeDesactivarPaciente && (
                  <FiltroDesactivados
                    checked={mascotasHook.verDesactivados}
                    onChange={mascotasHook.setVerDesactivados}
                  />
                )}
              </div>

              <section aria-label="Lista de pacientes" className="overflow-hidden rounded-2xl bg-card">
                {mascotasHook.mascotasQuery.isLoading ? (
                  <FilasSkeleton rows={6} />
                ) : mascotasHook.mascotasRows.length === 0 ? (
                  <ListaVacia
                    titulo={
                      mascotasHook.buscarAplicado
                        ? `Sin resultados para «${mascotasHook.buscarAplicado}»`
                        : 'Aún no hay pacientes registrados'
                    }
                    cuerpo={
                      mascotasHook.buscarAplicado
                        ? 'Puedes buscar por nombre, raza o por los datos del tutor.'
                        : 'Registra el primer paciente con el botón Nuevo paciente.'
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="text-left text-[13px] text-muted-foreground">
                          <th scope="col" className="px-5 pb-3 pt-4 font-medium">Paciente</th>
                          <th scope="col" className="px-3 pb-3 pt-4 font-medium">Tutor</th>
                          <th scope="col" className="px-3 pb-3 pt-4 font-medium">Edad</th>
                          <th scope="col" className="px-3 pb-3 pt-4 text-right font-medium">Peso</th>
                          <th scope="col" className="px-5 pb-3 pt-4 font-medium">
                            <span className="sr-only">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mascotasHook.mascotasRows.map((row) => (
                          <tr key={row.id} className="border-t border-border transition hover:bg-muted">
                            <td className="px-5 py-3">
                              <Link
                                to={row.historiasTo || '#'}
                                className={`flex items-center gap-3 rounded-lg text-foreground ${FOCO}`}
                              >
                                <PetAvatar name={row.paciente} photo={row.fotoPerfil} especie={row.raw?.especie} />
                                <span className="flex min-w-0 flex-col gap-0.5">
                                  <span className="truncate text-[15px] font-semibold">{row.paciente}</span>
                                  <span className="truncate text-[13px] text-muted-foreground">
                                    {[row.raza || row.especie, SEXO[row.raw?.sexo]].filter(Boolean).join(' · ')}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">{row.tutor}</span>
                                <span className="text-[13px] text-muted-foreground">{row.contacto}</span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-foreground">
                              {row.edad === 'Sin edad' ? <span className="text-muted-foreground">—</span> : row.edad}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                              {row.peso === 'Sin peso' ? <span className="text-muted-foreground">—</span> : row.peso}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <AccionesPaciente
                                  nombre={row.paciente}
                                  antecedentesTo={row.antecedentesTo}
                                  onEditar={
                                    puedeGestionarPaciente && !propsAccion.disabled
                                      ? () => mascotasHook.openEditDrawer(row.raw)
                                      : null
                                  }
                                  onCambiarEstado={
                                    !puedeDesactivarPaciente
                                      ? null
                                      : mascotasHook.verDesactivados
                                        ? () =>
                                            mascotasHook.cambiarEstadoMascotaMutation.mutate({ mascotaId: row.id, activar: true })
                                        : () => setPacienteADesactivar(row)
                                  }
                                  reactivar={mascotasHook.verDesactivados}
                                />
                                {row.historiasTo && (
                                  <Link
                                    to={row.historiasTo}
                                    className={`inline-flex h-9 items-center rounded-lg bg-secondary px-3 text-[13px] font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px ${FOCO}`}
                                  >
                                    Abrir ficha
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <PiePaginacion
                  pagina={mascotasHook.mascotasQuery.data?.paginaActual || 1}
                  paginas={mascotasHook.mascotasQuery.data?.paginas || 1}
                  total={mascotasHook.mascotasQuery.data?.total}
                  etiqueta={mascotasHook.mascotasQuery.data?.total === 1 ? 'paciente' : 'pacientes'}
                  onChange={mascotasHook.setPagina}
                />
              </section>
            </div>
          )}

          {/* Vista: Tutores */}
          {activeTab === 'tutores' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Buscador
                  value={tutoresHook.buscar}
                  onChange={tutoresHook.setBuscar}
                  placeholder="Nombre, documento o teléfono"
                  ariaLabel="Buscar tutor"
                  cargando={tutoresHook.tutoresQuery.isFetching}
                />
                {puedeDesactivarPaciente && (
                  <FiltroDesactivados
                    checked={tutoresHook.verDesactivados}
                    onChange={tutoresHook.setVerDesactivados}
                  />
                )}
              </div>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section aria-label="Lista de tutores" className="overflow-hidden rounded-2xl bg-card">
                  {tutoresHook.tutoresQuery.isLoading ? (
                    <FilasSkeleton rows={6} />
                  ) : tutoresRows.length === 0 ? (
                    <ListaVacia
                      titulo={
                        tutoresHook.buscarAplicado
                          ? `Sin resultados para «${tutoresHook.buscarAplicado}»`
                          : 'Aún no hay tutores registrados'
                      }
                      cuerpo={
                        tutoresHook.buscarAplicado
                          ? 'Puedes buscar por nombre, número de documento o teléfono.'
                          : 'Registra un nuevo tutor con el botón Nuevo tutor.'
                      }
                    />
                  ) : (
                    <div className="flex flex-col gap-0.5 p-2">
                      {tutoresRows.map((row) => {
                        const seleccionado = tutorSeleccionado?.id === row.id
                        const numMascotas = row.raw?.Mascota?.length ?? row.raw?.Mascotas?.length ?? 0
                        return (
                          <button
                            key={row.id}
                            type="button"
                            aria-pressed={seleccionado}
                            onClick={() => setTutorSeleccionadoId(row.id)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition',
                              FOCO,
                              seleccionado ? 'bg-accent' : 'hover:bg-muted'
                            )}
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[15px] font-bold text-secondary-foreground">
                              {iniciales(row.nombre)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="truncate text-[15px] font-semibold text-foreground">{row.nombre}</span>
                              <span className="truncate text-[13px] text-muted-foreground">
                                {numMascotas === 1 ? '1 mascota' : `${numMascotas} mascotas`} · {row.telefono}
                              </span>
                            </span>
                            <span className="hidden shrink-0 text-[13px] text-muted-foreground sm:block">
                              {row.ciudad !== '—' ? row.ciudad : ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <PiePaginacion
                    pagina={tutoresHook.tutoresQuery.data?.paginaActual || 1}
                    paginas={tutoresHook.tutoresQuery.data?.paginas || 1}
                    total={tutoresHook.tutoresQuery.data?.total}
                    etiqueta={tutoresHook.tutoresQuery.data?.total === 1 ? 'tutor' : 'tutores'}
                    onChange={tutoresHook.setPagina}
                  />
                </section>

                {tutorSeleccionado ? (
                  <TutorDetalle
                    tutor={tutorSeleccionado}
                    puedeGestionarTutor={puedeGestionarTutor}
                    puedeDesactivar={puedeDesactivarPaciente}
                    verDesactivados={tutoresHook.verDesactivados}
                    propsAccion={propsAccion}
                    onEditar={() => tutoresHook.openEditDrawer(tutorSeleccionado.raw)}
                    onDesactivar={() => setTutorADesactivar(tutorSeleccionado)}
                    onReactivar={() =>
                      tutoresHook.cambiarEstadoTutorMutation.mutate({ propietarioId: tutorSeleccionado.raw.id, activar: true })
                    }
                    reactivando={tutoresHook.cambiarEstadoTutorMutation.isPending}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pacienteADesactivar)}
        onOpenChange={(abierto) => { if (!abierto) setPacienteADesactivar(null) }}
        title={`¿Desactivar a ${pacienteADesactivar?.paciente || 'este paciente'}?`}
        description="Dejará de aparecer en las listas y al agendar. Su historia clínica se conserva y puedes reactivarlo desde «Ver desactivados»."
        confirmLabel="Desactivar"
        variant="destructive"
        loading={mascotasHook.cambiarEstadoMascotaMutation.isPending}
        onConfirm={() =>
          mascotasHook.cambiarEstadoMascotaMutation.mutate(
            { mascotaId: pacienteADesactivar.id, activar: false },
            { onSuccess: () => setPacienteADesactivar(null) }
          )
        }
      />

      <ConfirmDialog
        open={Boolean(tutorADesactivar)}
        onOpenChange={(abierto) => { if (!abierto) setTutorADesactivar(null) }}
        title={`¿Desactivar a ${tutorADesactivar?.nombre || 'este tutor'}?`}
        description="Dejará de aparecer en las listas y al buscar tutores. Sus pacientes, historias y ventas se conservan, y puedes reactivarlo desde «Ver desactivados»."
        confirmLabel="Desactivar"
        variant="destructive"
        loading={tutoresHook.cambiarEstadoTutorMutation.isPending}
        onConfirm={() =>
          tutoresHook.cambiarEstadoTutorMutation.mutate(
            { propietarioId: tutorADesactivar.raw.id, activar: false },
            { onSuccess: () => setTutorADesactivar(null) }
          )
        }
      />

      {/* Drawer: alta y edicion de paciente */}
      <PacienteDrawer
        open={mascotasHook.drawerOpen}
        editingPaciente={mascotasHook.editingPaciente}
        propietarios={mascotasHook.propietariosSelectorQuery.data?.propietarios || []}
        isSearchingOwners={mascotasHook.propietariosSelectorQuery.isFetching}
        ownerSearch={mascotasHook.ownerSearch}
        onOwnerSearch={mascotasHook.setOwnerSearch}
        onClose={mascotasHook.closeDrawer}
        onSubmit={mascotasHook.handleDrawerSubmit}
        isPending={mascotasHook.isPending}
      />

      {/* Drawer: alta y edicion de tutor */}
      <TutorDrawer
        open={tutoresHook.drawerOpen}
        editingTutor={tutoresHook.editingTutor}
        onClose={tutoresHook.closeDrawer}
        onSubmit={tutoresHook.handleDrawerSubmit}
        isPending={tutoresHook.isPending}
      />
    </AdminShell>
  )
}

// Panel con los datos del tutor elegido y sus mascotas.
function TutorDetalle({
  tutor,
  puedeGestionarTutor,
  puedeDesactivar,
  verDesactivados,
  propsAccion,
  onEditar,
  onDesactivar,
  onReactivar,
  reactivando,
}) {
  const mascotas = tutor.raw?.Mascota || tutor.raw?.Mascotas || []
  const botonClaro = `inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-6">
      <section aria-labelledby="tutor-detalle" className="flex flex-col gap-4 rounded-2xl bg-primary p-6 text-primary-foreground">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-brand text-2xl font-bold text-foreground">
            {iniciales(tutor.nombre)}
          </span>
          <div className="min-w-0">
            <h2 id="tutor-detalle" className="text-[28px] font-semibold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]">
              {tutor.nombre}
            </h2>
            <p className="mt-1 text-sm opacity-85">{tutor.documento}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
          <div className="min-w-0">
            <dt className="text-[13px] opacity-75">Celular</dt>
            <dd className="mt-0.5 font-semibold">
              {tutor.raw?.telefono ? (
                <a href={`tel:${tutor.raw.telefono}`} className={`rounded hover:underline ${FOCO}`}>{tutor.telefono}</a>
              ) : (
                tutor.telefono
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[13px] opacity-75">Correo</dt>
            <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{tutor.email}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[13px] opacity-75">Ciudad</dt>
            <dd className="mt-0.5 font-semibold">{tutor.ciudad}</dd>
          </div>
          {tutor.raw?.barrio ? (
            <div className="min-w-0">
              <dt className="text-[13px] opacity-75">Barrio</dt>
              <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{tutor.raw.barrio}</dd>
            </div>
          ) : null}
          {tutor.raw?.direccion ? (
            <div className="min-w-0">
              <dt className="text-[13px] opacity-75">Dirección</dt>
              <dd className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{tutor.raw.direccion}</dd>
            </div>
          ) : null}
        </dl>
        {puedeGestionarTutor ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditar}
              aria-label={`Editar ${tutor.nombre}`}
              {...propsAccion}
              className={cn(botonClaro, 'bg-primary-foreground text-primary hover:brightness-95')}
            >
              Editar datos
            </button>
            {puedeDesactivar &&
              (verDesactivados ? (
                <button
                  type="button"
                  onClick={onReactivar}
                  disabled={reactivando}
                  aria-label={`Reactivar ${tutor.nombre}`}
                  className={cn(botonClaro, 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25')}
                >
                  Reactivar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onDesactivar}
                  aria-label={`Desactivar ${tutor.nombre}`}
                  className={cn(botonClaro, 'bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25')}
                >
                  Desactivar
                </button>
              ))}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="tutor-mascotas" className="flex flex-col gap-2.5 rounded-2xl bg-card p-5">
        <h3 id="tutor-mascotas" className="text-[17px] font-semibold text-foreground">Sus mascotas</h3>
        {mascotas.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-3.5 text-sm text-muted-foreground">No tiene mascotas activas.</p>
        ) : (
          mascotas.map((mascota) => (
            <Link
              key={mascota.id}
              to={`/pacientes/${mascota.id}/historial`}
              className={`flex items-center gap-3 rounded-xl bg-muted p-3 text-foreground transition hover:bg-accent ${FOCO}`}
            >
              <PetAvatar name={mascota.nombre} especie={mascota.especie} className="h-10 w-10 rounded-xl text-base" />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{mascota.nombre}</span>
              <span className="shrink-0 text-[13px] font-semibold text-primary">Abrir ficha</span>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
