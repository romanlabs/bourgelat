import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dialog, DropdownMenu } from 'radix-ui'
import {
  Boxes,
  Building2,
  CalendarClock,
  HeartPulse,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PawPrint,
  Receipt,
  Search,
  ShieldCheck,
  Stethoscope,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLogout, useReenviarVerificacion } from '@/features/auth/useAuth'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useAuthStore } from '@/store/authStore'
import SuscripcionBanner from '@/components/shared/SuscripcionBanner'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { ALL_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS, ROL_ACTION_ORDER } from './quickActions'
import QuickCreateMenu from './QuickCreateMenu'
import { HeaderSlotContext } from './HeaderSlotContext'

const ROL_LABELS_SIDEBAR = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepcionista',
  auxiliar: 'Auxiliar',
  facturador: 'Facturador',
  superadmin: 'Administrador de la plataforma',
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Panel de control', to: '/dashboard', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint },
  { key: 'antecedentes', label: 'Antecedentes', to: '/antecedentes', icon: HeartPulse },
  { key: 'finanzas', label: 'Caja', to: '/finanzas', icon: Receipt },
  { key: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes },
  { key: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { key: 'configuracion', label: 'Clínica', to: '/configuracion', icon: Building2 },
  { key: 'auditoria', label: 'Auditoría', to: '/auditoria', icon: History },
  { key: 'planes', label: 'Planes', to: '/planes', icon: ShieldCheck },
]

const NAV_SECTIONS = [
  {
    key: 'operacion',
    label: 'Operación diaria',
    items: ['dashboard', 'agenda', 'pacientes', 'antecedentes'],
  },
  {
    key: 'gestion',
    label: 'Gestión administrativa',
    items: ['finanzas', 'inventario', 'usuarios'],
  },
  {
    key: 'control',
    label: 'Configuración y control',
    items: ['configuracion', 'auditoria', 'planes'],
  },
]

const NAV_ITEMS_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

function NavDrawerLink({ item, active, onNavigate }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-[#91e7e0]/10 text-white'
          : 'text-[#91e7e0]/45 hover:bg-[#081827] hover:text-white'
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#91e7e0]" />
      ) : null}
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-[#91e7e0]' : 'text-[#91e7e0]/40'
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export default function AdminShell({
  currentKey,
  title,
  description,
  children,
  actions,
  headerBadge,
  quickActions = null,
  showQuickActions = false,
  headerVariant = 'dark',
  hidePageHeader = false,
}) {
  const headerLight = headerVariant === 'light'
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const dark = useThemeStore((state) => state.dark)
  const toggleDark = useThemeStore((state) => state.toggleDark)
  const { logout } = useLogout()
  const { mutate: reenviarVerificacion, isPending: reenviandoVerificacion } = useReenviarVerificacion()
  const navigate = useNavigate()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [bannerVerificacionOculto, setBannerVerificacionOculto] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  // Slot central de la barra superior: paginas como Agenda ponen ahi su propio
  // toolbar (Hoy/prev/next/vista) en vez de duplicar una segunda barra debajo.
  const [headerCenter, setHeaderCenter] = useState(null)
  const searchInputRef = useRef(null)

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clinica'

  const busquedaDiferida = useDebouncedValue(searchQuery.trim())
  const puedeBuscarContenido = isSearchOpen && busquedaDiferida.length >= 2

  const mascotasSearchQuery = useQuery({
    queryKey: ['busqueda-global-mascotas', busquedaDiferida],
    queryFn: () => pacientesApi.obtenerMascotas({ buscar: busquedaDiferida, limite: 5 }),
    enabled: puedeBuscarContenido,
    staleTime: 30_000,
  })

  const propietariosSearchQuery = useQuery({
    queryKey: ['busqueda-global-propietarios', busquedaDiferida],
    queryFn: () => pacientesApi.obtenerPropietarios({ buscar: busquedaDiferida, limite: 5 }),
    enabled: puedeBuscarContenido,
    staleTime: 30_000,
  })

  const mascotasEncontradas = puedeBuscarContenido
    ? mascotasSearchQuery.data?.mascotas || []
    : []
  const propietariosEncontrados = puedeBuscarContenido
    ? propietariosSearchQuery.data?.propietarios || []
    : []
  const buscandoContenido =
    puedeBuscarContenido &&
    (mascotasSearchQuery.isLoading || propietariosSearchQuery.isLoading)

  const modulosFiltrados = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return NAV_ITEMS
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query))
  }, [searchQuery])

  const goToResult = (to) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    navigate(to)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/') return
      const target = event.target
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (isTyping) return
      event.preventDefault()
      setIsSearchOpen(true)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const visibleQuickActions = useMemo(() => {
    if (!showQuickActions) return []
    if (quickActions) return quickActions
    const order = ROL_ACTION_ORDER[usuario?.rol]
    if (!order) return DEFAULT_QUICK_ACTIONS
    return order.map((key) => ALL_QUICK_ACTIONS[key])
  }, [showQuickActions, quickActions, usuario?.rol])

  const usuarioIniciales = useMemo(() => {
    const source = usuario?.nombre || usuario?.email || 'BC'
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || '')
      .join('')
  }, [usuario?.email, usuario?.nombre])

  return (
    <HeaderSlotContext.Provider value={setHeaderCenter}>
    <div className="admin-workspace min-h-screen bg-background text-foreground">
      <header
        className={cn(
          'sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b px-3 sm:px-4',
          headerLight
            ? 'border-border bg-white text-foreground'
            : 'border-[#0c2235] bg-[#06111c] text-white'
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <SimpleTooltip label="Menú principal">
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              aria-label="Menú principal"
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
                headerLight
                  ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  : 'text-[#91e7e0]/70 hover:bg-[#081827] hover:text-[#91e7e0]'
              )}
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </SimpleTooltip>

          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                headerLight ? 'bg-primary/10 text-primary' : 'bg-[#91e7e0]/10 text-[#91e7e0]'
              )}
            >
              <Stethoscope className="h-4 w-4" />
            </span>
            <span
              className={cn(
                'truncate text-sm font-semibold',
                headerLight ? 'text-foreground' : 'text-white'
              )}
            >
              {nombreClinica}
            </span>
          </Link>
        </div>

        <div className="hidden flex-1 justify-center sm:flex">
          {headerCenter || (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                'flex w-full max-w-xs items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition',
                headerLight
                  ? 'border-border bg-muted text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  : 'border-white/10 bg-[#081827] text-[#91e7e0]/50 hover:border-white/20 hover:text-[#91e7e0]/80'
              )}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">Buscar</span>
              <kbd
                className={cn(
                  'rounded border px-1.5 py-0.5 text-[11px] font-semibold',
                  headerLight
                    ? 'border-border bg-card text-muted-foreground'
                    : 'border-white/15 bg-white/5 text-[#91e7e0]/50'
                )}
              >
                /
              </kbd>
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                title={`${usuario?.nombre || 'Mi perfil'} · Ver perfil`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold transition focus:outline-none focus-visible:ring-2',
                  headerLight
                    ? 'border-border bg-muted text-primary hover:ring-2 hover:ring-primary/40 focus-visible:ring-primary/40'
                    : 'border-white/15 bg-[#081827] text-[#91e7e0] hover:ring-2 hover:ring-[#91e7e0]/40 focus-visible:ring-[#91e7e0]/40'
                )}
              >
                {usuario?.foto ? (
                  <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  usuarioIniciales
                )}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-64 rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              >
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-sidebar text-sm font-semibold text-[#91e7e0]">
                    {usuario?.foto ? (
                      <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      usuarioIniciales
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {usuario?.nombre || 'Sin nombre'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {usuario?.email || ROL_LABELS_SIDEBAR[usuario?.rol]}
                    </p>
                  </div>
                </div>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Item asChild>
                  <Link
                    to="/perfil"
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Mi perfil
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault()
                    toggleDark()
                  }}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
                >
                  {dark ? (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  )}
                  {dark ? 'Modo claro' : 'Modo oscuro'}
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Item
                  onSelect={logout}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive outline-none transition hover:bg-destructive/10 focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {usuario?.proveedorAuth === 'local' && usuario?.emailVerificado === false && !bannerVerificacionOculto ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>
            Verifica tu correo (<span className="font-semibold">{usuario?.email}</span>) para poder cambiar tu
            contraseña más adelante.
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              disabled={reenviandoVerificacion}
              onClick={() => reenviarVerificacion({ email: usuario.email })}
              className="font-semibold underline decoration-amber-400 underline-offset-2 hover:text-amber-950 disabled:opacity-60"
            >
              {reenviandoVerificacion ? 'Enviando...' : 'Reenviar verificación'}
            </button>
            <button
              type="button"
              onClick={() => setBannerVerificacionOculto(true)}
              title="Ocultar por ahora"
              className="text-amber-700 hover:text-amber-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Dialog.Root open={isNavOpen} onOpenChange={setIsNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:[animation:admin-drawer-overlay-in_250ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_200ms_ease-in]" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col rounded-r-2xl border-r border-white/15 bg-[#06111c] text-white shadow-[10px_0_40px_rgba(2,8,14,0.65)] data-[state=open]:[animation:admin-drawer-in_300ms_ease-out] data-[state=closed]:[animation:admin-drawer-out_200ms_ease-in]"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#91e7e0]/10 text-[#91e7e0]">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <Dialog.Title asChild>
                  <span className="truncate text-sm font-semibold text-white">{nombreClinica}</span>
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  title="Cerrar menu"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#91e7e0]/60 transition hover:bg-[#081827] hover:text-[#91e7e0]"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
              {NAV_SECTIONS.map((section) => {
                const sectionItems = section.items
                  .map((itemKey) => NAV_ITEMS_BY_KEY[itemKey])
                  .filter(Boolean)

                return (
                  <section key={section.key}>
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91e7e0]/30">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {sectionItems.map((item) => (
                        <NavDrawerLink
                          key={item.key}
                          item={item}
                          active={currentKey === item.key}
                          onNavigate={() => setIsNavOpen(false)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </nav>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open)
          if (!open) setSearchQuery('')
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:[animation:admin-drawer-overlay-in_200ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_150ms_ease-in]" />
          <Dialog.Content
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              searchInputRef.current?.focus()
            }}
            className="fixed left-1/2 top-4 z-50 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#0d1520] text-white shadow-2xl"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Buscar en Bourgelat</Dialog.Title>

            <div className="p-3">
              <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-[#06111c] px-3.5 py-2.5 ring-2 ring-primary/30">
                <Search className="h-[18px] w-[18px] shrink-0 text-[#91e7e0]/60" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar un modulo..."
                  className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#91e7e0]/40"
                />
              </div>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto px-3 pb-3">
              {buscandoContenido ? (
                <p className="px-2.5 py-1 text-sm text-[#91e7e0]/40">Buscando...</p>
              ) : null}

              {mascotasEncontradas.length > 0 ? (
                <section>
                  <p className="mb-1 px-2 text-xs font-semibold text-[#91e7e0]/40">Pacientes</p>
                  <div className="space-y-0.5">
                    {mascotasEncontradas.map((mascota) => (
                      <button
                        key={mascota.id}
                        type="button"
                        onClick={() =>
                          goToResult(`/pacientes?tab=pacientes&buscar=${encodeURIComponent(mascota.nombre)}`)
                        }
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-white transition hover:bg-[#161f2b]"
                      >
                        <PawPrint className="h-4 w-4 shrink-0 text-[#91e7e0]/60" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{mascota.nombre}</span>
                          <span className="block truncate text-xs text-[#91e7e0]/40">
                            {[mascota.especie, mascota.Propietario?.nombre].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-[#91e7e0]/30 group-hover:text-[#91e7e0]/60">
                          Ver paciente
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {propietariosEncontrados.length > 0 ? (
                <section>
                  <p className="mb-1 px-2 text-xs font-semibold text-[#91e7e0]/40">Tutores</p>
                  <div className="space-y-0.5">
                    {propietariosEncontrados.map((propietario) => (
                      <button
                        key={propietario.id}
                        type="button"
                        onClick={() =>
                          goToResult(`/pacientes?tab=tutores&buscar=${encodeURIComponent(propietario.nombre)}`)
                        }
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-white transition hover:bg-[#161f2b]"
                      >
                        <Users className="h-4 w-4 shrink-0 text-[#91e7e0]/60" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{propietario.nombre}</span>
                          <span className="block truncate text-xs text-[#91e7e0]/40">
                            {propietario.telefono || propietario.email || 'Sin contacto'}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-[#91e7e0]/30 group-hover:text-[#91e7e0]/60">
                          Ver tutor
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {puedeBuscarContenido &&
              !buscandoContenido &&
              mascotasEncontradas.length === 0 &&
              propietariosEncontrados.length === 0 ? (
                <p className="px-2.5 py-1 text-sm text-[#91e7e0]/40">
                  Sin pacientes ni tutores para "{busquedaDiferida}".
                </p>
              ) : null}

              {modulosFiltrados.length > 0 ? (
                <section>
                  <p className="mb-1 px-2 text-xs font-semibold text-[#91e7e0]/40">Ir a la sección</p>
                  <div className="space-y-0.5">
                    {modulosFiltrados.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => goToResult(item.to)}
                          className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-white transition hover:bg-[#161f2b]"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-[#91e7e0]/60" />
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="shrink-0 text-xs text-[#91e7e0]/30 group-hover:text-[#91e7e0]/60">
                            Abrir
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs text-[#91e7e0]/30">
              <span>Escribe el nombre de un paciente o tutor</span>
              <span>Presiona / para abrir la búsqueda</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <main className="mx-auto max-w-[1720px] space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        <SuscripcionBanner soloLecturaOnly={currentKey !== 'dashboard'} />

        {!hidePageHeader && (
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{title}</h1>
                  {headerBadge ? <div className="flex shrink-0">{headerBadge}</div> : null}
                </div>
                {description ? (
                  <p className="max-w-4xl text-sm leading-5 text-muted-foreground">{description}</p>
                ) : null}
              </div>

              {actions || visibleQuickActions.length > 0 ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {actions}
                  <QuickCreateMenu actions={visibleQuickActions} />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
    </HeaderSlotContext.Provider>
  )
}
