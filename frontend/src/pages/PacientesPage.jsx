import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarClock,
  FileText,
  HeartPulse,
  LayoutDashboard,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta, NavCtaLink } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatNumber, toNumber } from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import Paginacion from '@/components/shared/Paginacion'
import PacienteDrawer from '@/features/pacientes/PacienteDrawer'
import TutorDrawer from '@/features/pacientes/TutorDrawer'
import { usePacientesResumen } from '@/features/pacientes/usePacientesResumen'
import { usePacientesMascotas, SPECIES_OPTIONS } from '@/features/pacientes/usePacientesMascotas'
import { useTutores } from '@/features/pacientes/useTutores'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'tutores', label: 'Tutores' },
]

function PetAvatar({ name, photo, size = 'h-10 w-10' }) {
  if (photo) {
    return <img src={photo} alt={`Foto de ${name}`} className={`${size} shrink-0 border border-border object-cover`} />
  }
  return (
    <div className={`${size} flex shrink-0 items-center justify-center border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground`}>
      {String(name || 'P').slice(0, 1)}
    </div>
  )
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 px-4 py-3">
          <div className="h-4 flex-1 rounded bg-muted/70" />
          <div className="h-4 w-28 rounded bg-muted/70" />
          <div className="h-4 w-20 rounded bg-muted/70" />
        </div>
      ))}
    </div>
  )
}

export default function PacientesPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)

  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() =>
    TABS.some((tab) => tab.id === tabParam) ? tabParam : 'resumen'
  )

  useEffect(() => {
    if (TABS.some((tab) => tab.id === tabParam)) setActiveTab(tabParam)
  }, [tabParam])

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])
  const featureSet = new Set(Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : [])
  const puedeVerModulo = featureSet.has('mascotas') && featureSet.has('propietarios')
  const puedeCrearTutor = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar'])
  const puedeCrearPaciente = hasAnyRole(usuario, ['admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'])

  const enabled = rolPermitido && puedeVerModulo

  const resumenHook = usePacientesResumen({ enabled })
  const mascotasHook = usePacientesMascotas({ enabled, featureSet })
  const tutoresHook = useTutores({ enabled })

  const limiteMascotas = toNumber(suscripcion?.limiteMascotas)

  useEffect(() => {
    document.title = 'Pacientes | Bourgelat'
  }, [])

  if (!rolPermitido) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad sobre la base clinica de pacientes y tutores.
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminShell
      currentKey="pacientes"
      title="Pacientes y tutores"
      description="Consulta y registra tutores y pacientes activos para agenda, antecedentes e historias clinicas."
      headerBadge={<StatusPill tone="border-primary/30 bg-primary/10 text-primary">Base activa</StatusPill>}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <NavCta to="/agenda" icon={CalendarClock} size="sm">Agenda</NavCta>
          <NavCta to="/antecedentes" icon={HeartPulse} variant="outline" size="sm">Antecedentes</NavCta>
          <NavCta to="/dashboard" icon={LayoutDashboard} variant="outline" size="sm">Dashboard</NavCta>
        </div>
      }
      asideNote="La recepcion crea tutores y pacientes desde esta pantalla. El equipo medico usa esta misma base para agenda e historias clinicas."
    >
      {!puedeVerModulo ? (
        <EmptyState
          icon={<Sparkles />}
          title="Pacientes no disponibles en el plan actual"
          description="La base de tutores y pacientes hace parte del trabajo diario. Si esta sección no aparece activa, revisa el plan contratado por la clínica."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="space-y-5">
          {/* Tab navigation */}
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
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  icon={PawPrint}
                  label="Pacientes activos"
                  value={formatNumber(resumenHook.totalMascotas)}
                  helper="Total de pacientes registrados en la clinica."
                  tone="text-cyan-700"
                />
                <KpiCard
                  icon={Users}
                  label="Tutores"
                  value={formatNumber(resumenHook.totalPropietarios)}
                  helper="Total de tutores registrados en la clinica."
                  tone="text-emerald-700"
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Cupo del plan"
                  value={
                    limiteMascotas === null
                      ? 'Sin limite'
                      : formatNumber(Math.max(limiteMascotas - resumenHook.totalMascotas, 0))
                  }
                  helper={
                    limiteMascotas === null
                      ? 'La suscripcion actual no tiene tope de pacientes.'
                      : `${formatNumber(resumenHook.totalMascotas)} de ${formatNumber(limiteMascotas)} en uso.`
                  }
                  tone="text-violet-700"
                />
                <KpiCard
                  icon={HeartPulse}
                  label="Historia clinica"
                  value={featureSet.has('historias') ? 'Activa' : 'No incluida'}
                  helper="Define si esta base ya puede pasar directo a evolucion clinica."
                  tone={featureSet.has('historias') ? 'text-rose-700' : 'text-amber-700'}
                />
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-12">
                <DonutCard
                  className="lg:col-span-3"
                  title="Especies registradas"
                  subtitle="Distribucion por especie de los pacientes."
                  data={resumenHook.speciesData}
                  centerLabel="Pacientes"
                  centerValue={formatNumber(resumenHook.mascotasResumen.length)}
                  formatter={formatNumber}
                  emptyMessage="Aun no hay pacientes para mostrar."
                  contentClassName="sm:grid-cols-1 justify-items-center text-center"
                  chartSize={140}
                />

                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card lg:col-span-9">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Ultimos pacientes registrados
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Acceso rapido a los pacientes agregados recientemente.
                    </p>
                  </div>
                  {resumenHook.mascotasResumen.length > 0 ? (
                    <div className="divide-y divide-border">
                      {resumenHook.mascotasResumen.slice(0, 5).map((mascota) => (
                        <button
                          key={mascota.id}
                          type="button"
                          onClick={() => setActiveTab('pacientes')}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/50"
                        >
                          <PetAvatar name={mascota.nombre} photo={mascota.fotoPerfil} size="h-9 w-9" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {mascota.nombre}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {[mascota.raza, mascota.Propietario?.nombre].filter(Boolean).join(' · ') ||
                                'Sin tutor asignado'}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">
                            Ver lista
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      Cuando registres pacientes apareceran aqui.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Pacientes */}
          {activeTab === 'pacientes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={mascotasHook.buscar}
                      onChange={(e) => { mascotasHook.setBuscar(e.target.value); mascotasHook.setPagina(1) }}
                      placeholder="Buscar paciente"
                      className="h-10 border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <select
                    value={mascotasHook.especie}
                    onChange={(e) => { mascotasHook.setEspecie(e.target.value); mascotasHook.setPagina(1) }}
                    className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {SPECIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {puedeCrearPaciente && (
                  <button
                    type="button"
                    onClick={mascotasHook.openDrawer}
                    className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo paciente
                  </button>
                )}
              </div>

              {mascotasHook.mascotasQuery.isLoading ? (
                <TableSkeleton rows={6} />
              ) : (
                <DataTable
                  title="Base activa de pacientes"
                  subtitle="Busqueda rapida con tutor, contacto y disponibilidad para ficha clinica."
                  rows={mascotasHook.mascotasRows}
                  columns={[
                    {
                      key: 'paciente',
                      label: 'Paciente',
                      render: (row) => (
                        <div className="flex items-start gap-3">
                          <PetAvatar name={row.paciente} photo={row.fotoPerfil} />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{row.paciente}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {row.especie}{row.raza ? ` / ${row.raza}` : ''}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[row.edad !== 'Sin edad' && row.edad, row.color, row.peso].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: 'tutor',
                      label: 'Tutor',
                      render: (row) => (
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{row.tutor}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{row.contacto}</p>
                        </div>
                      ),
                    },
                    {
                      key: 'ficha',
                      label: 'Ficha',
                      render: (row) => <StatusPill tone={row.fichaTone}>{row.fichaLabel}</StatusPill>,
                    },
                    {
                      key: 'acciones',
                      label: 'Acciones',
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          {row.historiasTo && (
                            <NavCtaLink to={row.historiasTo} size="sm">Historia</NavCtaLink>
                          )}
                          {row.antecedentesTo && (
                            <NavCtaLink to={row.antecedentesTo} size="sm">Antecedentes</NavCtaLink>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay pacientes para este filtro"
                  emptyBody="Ajusta la busqueda o registra el primer paciente con el boton Nuevo paciente."
                />
              )}

              <Paginacion
                pagina={mascotasHook.mascotasQuery.data?.paginaActual || 1}
                paginas={mascotasHook.mascotasQuery.data?.paginas || 1}
                onChange={mascotasHook.setPagina}
              />
            </div>
          )}

          {/* Tab: Tutores */}
          {activeTab === 'tutores' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={tutoresHook.buscar}
                    onChange={(e) => { tutoresHook.setBuscar(e.target.value); tutoresHook.setPagina(1) }}
                    placeholder="Buscar tutor"
                    className="h-10 border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
                {puedeCrearTutor && (
                  <button
                    type="button"
                    onClick={tutoresHook.openDrawer}
                    className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <UserRound className="h-4 w-4" />
                    Nuevo tutor
                  </button>
                )}
              </div>

              {tutoresHook.tutoresQuery.isLoading ? (
                <TableSkeleton rows={6} />
              ) : (
                <DataTable
                  title="Tutores registrados"
                  subtitle="Responsables vinculados a los pacientes activos de la clinica."
                  rows={tutoresHook.tutoresRows}
                  columns={[
                    {
                      key: 'nombre',
                      label: 'Nombre',
                      render: (row) => (
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-muted text-sm font-semibold uppercase text-muted-foreground">
                            {String(row.nombre).slice(0, 1)}
                          </div>
                          <p className="font-semibold text-foreground">{row.nombre}</p>
                        </div>
                      ),
                    },
                    { key: 'documento', label: 'Documento' },
                    { key: 'telefono', label: 'Telefono' },
                    { key: 'email', label: 'Correo' },
                    { key: 'ciudad', label: 'Ciudad' },
                  ]}
                  emptyTitle="No hay tutores para este filtro"
                  emptyBody="Ajusta la busqueda o registra un nuevo tutor con el boton Nuevo tutor."
                />
              )}

              <Paginacion
                pagina={tutoresHook.tutoresQuery.data?.paginaActual || 1}
                paginas={tutoresHook.tutoresQuery.data?.paginas || 1}
                onChange={tutoresHook.setPagina}
              />
            </div>
          )}
        </div>
      )}

      {/* Drawer: Nuevo paciente */}
      <PacienteDrawer
        open={mascotasHook.drawerOpen}
        propietarios={mascotasHook.propietariosSelectorQuery.data?.propietarios || []}
        isSearchingOwners={mascotasHook.propietariosSelectorQuery.isFetching}
        ownerSearch={mascotasHook.ownerSearch}
        onOwnerSearch={mascotasHook.setOwnerSearch}
        onClose={mascotasHook.closeDrawer}
        onSubmit={mascotasHook.handleDrawerSubmit}
        isPending={mascotasHook.isPending}
      />

      {/* Drawer: Nuevo tutor */}
      <TutorDrawer
        open={tutoresHook.drawerOpen}
        onClose={tutoresHook.closeDrawer}
        onSubmit={tutoresHook.handleDrawerSubmit}
        isPending={tutoresHook.isPending}
      />
    </AdminShell>
  )
}
