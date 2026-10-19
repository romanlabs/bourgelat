import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dialog, DropdownMenu } from 'radix-ui'
import {
  Boxes,
  ChartColumn,
  CalendarClock,
  ChevronsUpDown,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  Moon,
  PawPrint,
  Receipt,
  Search,
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
import { AdminSearchContext, HeaderSlotContext } from './HeaderSlotContext'
import { etiquetaEspecie } from '@/lib/especies'
import { useModuleAccess } from '@/lib/useModuleAccess'
import { canAccessModule, getUserRoles } from '@/lib/permissions'

const QUICK_ACTION_MODULE = {
  facturar: 'caja',
  paciente: 'pacientes',
  historia: 'pacientes',
  agenda: 'agenda',
  inventario: 'inventario',
}

const ROL_LABELS_SIDEBAR = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepción',
  auxiliar: 'Auxiliar',
  facturador: 'Facturación',
  superadmin: 'Administrador de la plataforma',
}

// Los módulos del día a día llevan icono; los administrativos van como texto
// debajo, para que el menú se lea de un vistazo.
// Un usuario puede tener varios roles (principal + adicionales): se muestran todos.
const etiquetaRoles = (usuario) =>
  getUserRoles(usuario)
    .map((rol) => ROL_LABELS_SIDEBAR[rol])
    .filter(Boolean)
    .join(' · ') || 'Mi perfil'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Hoy', to: '/dashboard', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint },
  { key: 'historias', label: 'Historias', to: '/historias', icon: FileText },
  { key: 'antecedentes', label: 'Antecedentes', to: '/antecedentes', icon: HeartPulse },
  { key: 'caja', label: 'Caja', to: '/caja', icon: Receipt },
  { key: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes },
  { key: 'finanzas', label: 'Finanzas', to: '/finanzas', icon: ChartColumn },
  { key: 'configuracion', label: 'Clínica', to: '/configuracion' },
  { key: 'usuarios', label: 'Usuarios', to: '/usuarios' },
  { key: 'auditoria', label: 'Auditoría', to: '/auditoria' },
  { key: 'soporte', label: 'Soporte', to: '/soporte' },
  { key: 'planes', label: 'Planes', to: '/planes' },
]

const NAV_SECTIONS = [
  {
    key: 'operacion',
    label: null,
    items: ['dashboard', 'agenda', 'pacientes', 'historias', 'antecedentes', 'caja', 'inventario', 'finanzas'],
  },
  {
    key: 'administracion',
    label: 'Administración',
    items: ['configuracion', 'usuarios', 'auditoria', 'soporte', 'planes'],
  },
]

const NAV_ITEMS_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

function NavItem({ item, active, onNavigate, bloqueado, onBloqueado }) {
  const Icon = item.icon

  if (bloqueado) {
    return (
      <button
        type="button"
        aria-disabled="true"
        onClick={onBloqueado}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 bajo:py-2 muy-bajo:py-1 text-left text-sm font-medium text-sidebar-foreground/55 transition-colors duration-150 hover:bg-sidebar-accent"
      >
        {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
        <span className="flex-1 truncate">{item.label}</span>
        <Lock className="h-3.5 w-3.5 shrink-0" />
      </button>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 bajo:py-2 muy-bajo:py-1 text-sm transition-colors duration-150',
        active
          ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
          : 'font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

// Menú de la cuenta: se abre desde el bloque del usuario en el menú lateral
// (escritorio) o desde el avatar de la barra superior (celular).
function MenuUsuario({ usuario, iniciales, pathname, dark, toggleDark, logout, align = 'end', side = 'bottom', children }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        className="z-50 w-64 rounded-xl bg-card p-1.5 text-card-foreground shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {usuario?.foto ? (
              <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
            ) : (
              iniciales
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {usuario?.nombre || 'Sin nombre'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {usuario?.email || etiquetaRoles(usuario)}
            </p>
          </div>
        </div>

        <DropdownMenu.Separator className="my-1 h-px bg-border" />

        <DropdownMenu.Item asChild>
          <Link
            to="/perfil"
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-accent focus:bg-accent"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            Mi perfil
          </Link>
        </DropdownMenu.Item>

        {/* Lleva la ruta actual para que el ticket nazca con el modulo
            donde ocurrio el problema. */}
        <DropdownMenu.Item asChild>
          <Link
            to={`/soporte?nuevo=1&desde=${encodeURIComponent(pathname)}`}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-accent focus:bg-accent"
          >
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            Ayuda y soporte
          </Link>
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onSelect={(event) => {
            event.preventDefault()
            toggleDark()
          }}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-accent focus:bg-accent"
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
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive outline-none transition hover:bg-danger-soft focus:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function SidebarContent({ currentKey, canAccess, guard, onNavigate, nombreClinica, usuario, iniciales, menuUsuario }) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6 bajo:gap-4 bajo:py-5 muy-bajo:gap-3 muy-bajo:py-4">
      <Link to="/dashboard" onClick={onNavigate} className="flex flex-col gap-1 px-3">
        <span className="text-[22px] font-bold leading-none tracking-[-0.03em] text-sidebar-accent-foreground">
          Bourgelat
        </span>
        <span className="truncate text-[13px] text-sidebar-foreground/75 muy-bajo:hidden">{nombreClinica}</span>
      </Link>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-5 overflow-y-auto bajo:gap-3 [scrollbar-width:thin]">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = section.items.map((itemKey) => NAV_ITEMS_BY_KEY[itemKey]).filter(Boolean)

          return (
            <div key={section.key} className="flex flex-col gap-0.5">
              {section.label ? (
                <p className="px-3 pb-1.5 text-[13px] text-sidebar-foreground/70 muy-bajo:pb-0.5">{section.label}</p>
              ) : null}
              {sectionItems.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  active={currentKey === item.key}
                  onNavigate={onNavigate}
                  bloqueado={!canAccess(item.key)}
                  onBloqueado={() => guard(item.key, item.label)}
                />
              ))}
            </div>
          )
        })}
      </nav>

      <MenuUsuario {...menuUsuario} align="start" side="top">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring muy-bajo:p-2',
            currentKey === 'perfil'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'bg-sidebar-accent/60 text-sidebar-accent-foreground hover:bg-sidebar-accent'
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand text-sm font-bold text-foreground muy-bajo:h-8 muy-bajo:w-8">
            {usuario?.foto ? <img src={usuario.foto} alt="" className="h-full w-full object-cover" /> : iniciales}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{usuario?.nombre || 'Mi perfil'}</span>
            <span className="truncate text-[13px] opacity-75">{etiquetaRoles(usuario)}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        </button>
      </MenuUsuario>
    </div>
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
  hidePageHeader = false,
  // Pantallas donde el contenido necesita todo el alto (Agenda): título más
  // chico y buscador como ícono.
  compactHeader = false,
  // Controles que van en la misma fila del título (la barra del calendario).
  titleAside = null,
  // Páginas con buscador propio (Pacientes, ficha): sin el botón del buscador
  // global del encabezado; Ctrl K sigue funcionando.
  hideSearch = false,
}) {
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const { canAccess, guard } = useModuleAccess()
  const dark = useThemeStore((state) => state.dark)
  const toggleDark = useThemeStore((state) => state.toggleDark)
  const { logout } = useLogout()
  const { mutate: reenviarVerificacion, isPending: reenviandoVerificacion } = useReenviarVerificacion()
  const navigate = useNavigate()
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [bannerVerificacionOculto, setBannerVerificacionOculto] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const openSearch = useCallback(() => setIsSearchOpen(true), [])
  const [searchQuery, setSearchQuery] = useState('')
  // Slot central de la barra superior: paginas como Agenda ponen ahi su propio
  // toolbar (Hoy/prev/next/vista) en vez de duplicar una segunda barra debajo.
  const [headerCenter, setHeaderCenter] = useState(null)
  const searchInputRef = useRef(null)

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clínica'

  const busquedaDiferida = useDebouncedValue(searchQuery.trim())
  const puedeBuscarContenido =
    isSearchOpen && busquedaDiferida.length >= 2 && canAccess('pacientes')

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
      // Ctrl/Cmd + K abre la búsqueda desde cualquier lado, incluso escribiendo.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsSearchOpen(true)
        return
      }
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
    const order = getUserRoles(usuario).map((rol) => ROL_ACTION_ORDER[rol]).find(Boolean)
    const actions = order ? order.map((key) => ALL_QUICK_ACTIONS[key]) : DEFAULT_QUICK_ACTIONS
    // Solo ofrece atajos a módulos a los que el usuario sí puede entrar.
    return actions.filter((action) => canAccessModule(usuario, QUICK_ACTION_MODULE[action.key]))
  }, [showQuickActions, quickActions, usuario])

  const usuarioIniciales = useMemo(() => {
    const source = usuario?.nombre || usuario?.email || 'BC'
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || '')
      .join('')
  }, [usuario?.email, usuario?.nombre])

  const menuUsuarioProps = {
    usuario,
    iniciales: usuarioIniciales,
    pathname: location.pathname,
    dark,
    toggleDark,
    logout,
  }

  const sidebarProps = {
    menuUsuario: menuUsuarioProps,
    currentKey,
    canAccess,
    guard,
    nombreClinica,
    usuario,
    iniciales: usuarioIniciales,
  }

  return (
    <AdminSearchContext.Provider value={openSearch}>
    <HeaderSlotContext.Provider value={setHeaderCenter}>
    <div className="admin-workspace min-h-screen bg-background text-foreground lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="min-w-0 flex-1">
        <header
          className={cn(
            'sticky top-0 z-40 flex h-16 items-center justify-between gap-3 bg-background/90 px-4 text-foreground backdrop-blur-sm sm:px-6 lg:px-10',
            // En escritorio la barra solo queda si la página no trae título
            // ni buscador propio (la ficha pone el suyo junto a «Volver»).
            !headerCenter && (!hidePageHeader || hideSearch) && 'lg:hidden'
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              aria-label="Menú principal"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition hover:bg-secondary"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="truncate text-base font-bold tracking-[-0.02em] text-foreground">
              Bourgelat
            </Link>
          </div>

          {/* Centro: cada pagina decide que va aqui (ver HeaderSlotContext). */}
          <div className="hidden min-w-0 flex-1 justify-start sm:flex">{headerCenter}</div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Buscar"
              className={cn(
                'flex h-10 items-center gap-2.5 rounded-lg bg-card px-3 text-sm text-muted-foreground transition hover:text-foreground',
                // Si la página usa el centro del encabezado (Agenda), el buscador
                // se reduce al icono para no apretar su barra.
                headerCenter ? '2xl:w-64' : 'sm:w-64'
              )}
            >
              <Search className="h-[18px] w-[18px] shrink-0" />
              <span className={cn('hidden flex-1 truncate whitespace-nowrap text-left', headerCenter ? '2xl:inline' : 'sm:inline')}>Buscar paciente o tutor</span>
              <kbd className={cn('hidden rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs font-semibold text-muted-foreground', headerCenter ? '2xl:inline' : 'sm:inline')}>
                Ctrl K
              </kbd>
            </button>

            <MenuUsuario {...menuUsuarioProps}>
              <button
                type="button"
                title={`${usuario?.nombre || 'Mi perfil'} · Opciones`}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand text-sm font-bold text-foreground transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              >
                {usuario?.foto ? <img src={usuario.foto} alt="" className="h-full w-full object-cover" /> : usuarioIniciales}
              </button>
            </MenuUsuario>
          </div>
        </header>

        {usuario?.proveedorAuth === 'local' && usuario?.emailVerificado === false && !bannerVerificacionOculto ? (
          <div className="mx-4 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning sm:mx-6 lg:mx-10">
            <span>
              Verifica tu correo (<span className="font-semibold">{usuario?.email}</span>) para poder cambiar tu
              contraseña más adelante.
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={reenviandoVerificacion}
                onClick={() => reenviarVerificacion({ email: usuario.email })}
                className="font-semibold underline decoration-warning/50 underline-offset-2 hover:text-foreground disabled:opacity-60"
              >
                {reenviandoVerificacion ? 'Enviando...' : 'Reenviar verificación'}
              </button>
              <SimpleTooltip label="Ocultar por ahora">
                <button
                  type="button"
                  onClick={() => setBannerVerificacionOculto(true)}
                  aria-label="Ocultar por ahora"
                  className="text-warning hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </SimpleTooltip>
            </div>
          </div>
        ) : null}

        <Dialog.Root open={isNavOpen} onOpenChange={setIsNavOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/50 data-[state=open]:[animation:admin-drawer-overlay-in_250ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_200ms_ease-in]" />
            <Dialog.Content
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground shadow-modal data-[state=open]:[animation:admin-drawer-in_300ms_ease-out] data-[state=closed]:[animation:admin-drawer-out_200ms_ease-in]"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">Menú principal</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  className="absolute right-3 top-5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/80 transition hover:bg-sidebar-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
              <SidebarContent {...sidebarProps} onNavigate={() => setIsNavOpen(false)} />
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
            <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/50 data-[state=open]:[animation:admin-drawer-overlay-in_200ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_150ms_ease-in]" />
            <Dialog.Content
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                searchInputRef.current?.focus()
              }}
              className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl bg-card text-card-foreground shadow-modal"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">Buscar en Bourgelat</Dialog.Title>

              <div className="flex h-16 items-center gap-3 border-b border-border px-5">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Busca un paciente, tutor o sección"
                  className="flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded-md bg-muted px-2 py-1 font-sans text-xs font-semibold text-muted-foreground">Esc</kbd>
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-2">
                {buscandoContenido ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
                ) : null}

                {mascotasEncontradas.length > 0 ? (
                  <section>
                    <p className="px-3 pb-1 pt-2 text-[13px] font-semibold text-muted-foreground">Pacientes</p>
                    <div className="space-y-0.5">
                      {mascotasEncontradas.map((mascota) => (
                        <button
                          key={mascota.id}
                          type="button"
                          onClick={() =>
                            goToResult(`/pacientes?tab=pacientes&buscar=${encodeURIComponent(mascota.nombre)}`)
                          }
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-accent"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent font-bold text-primary">
                            {mascota.nombre?.[0]?.toUpperCase() || <PawPrint className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{mascota.nombre}</span>
                            <span className="block truncate text-[13px] text-muted-foreground">
                              {[etiquetaEspecie(mascota.especie), mascota.Propietario?.nombre].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {propietariosEncontrados.length > 0 ? (
                  <section>
                    <p className="px-3 pb-1 pt-2 text-[13px] font-semibold text-muted-foreground">Tutores</p>
                    <div className="space-y-0.5">
                      {propietariosEncontrados.map((propietario) => (
                        <button
                          key={propietario.id}
                          type="button"
                          onClick={() =>
                            goToResult(`/pacientes?tab=tutores&buscar=${encodeURIComponent(propietario.nombre)}`)
                          }
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-accent"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                            <Users className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{propietario.nombre}</span>
                            <span className="block truncate text-[13px] text-muted-foreground">
                              {propietario.telefono || propietario.email || 'Sin contacto'}
                            </span>
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
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No hay pacientes ni tutores con «{busquedaDiferida}».
                  </p>
                ) : null}

                {modulosFiltrados.length > 0 ? (
                  <section>
                    <p className="px-3 pb-1 pt-2 text-[13px] font-semibold text-muted-foreground">Ir a</p>
                    <div className="space-y-0.5">
                      {modulosFiltrados.map((item) => {
                        const Icon = item.icon || LayoutDashboard
                        const permitido = canAccess(item.key)
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              if (!guard(item.key, item.label)) return
                              goToResult(item.to)
                            }}
                            aria-disabled={!permitido || undefined}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-accent',
                              permitido ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="flex-1 truncate font-medium">{item.label}</span>
                            {permitido ? null : (
                              <span className="flex shrink-0 items-center gap-1 text-xs">
                                <Lock className="h-3 w-3" />
                                Sin acceso
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-muted px-5 py-3 text-[13px] text-muted-foreground">
                <span>Escribe el nombre de un paciente o tutor</span>
                <span>
                  <span className="font-semibold text-foreground">Ctrl K</span> o{' '}
                  <span className="font-semibold text-foreground">/</span> desde cualquier pantalla
                </span>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <main className={cn('mx-auto max-w-[1600px] space-y-6 px-4 pb-14 pt-2 sm:px-6 lg:px-10 bajo:space-y-4', !headerCenter && !hidePageHeader && (compactHeader ? 'space-y-4 pb-4 lg:pt-5' : 'lg:pt-8 bajo:lg:pt-5'))}>
          <SuscripcionBanner soloLecturaOnly={currentKey !== 'dashboard'} />

          {!hidePageHeader && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className={cn('min-w-0 flex-1', titleAside && 'flex flex-wrap items-center gap-x-6 gap-y-3')}>
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1
                    className={cn(
                      'font-semibold leading-none text-foreground',
                      compactHeader
                        ? 'text-2xl tracking-[-0.03em] sm:text-[26px]'
                        : 'text-3xl tracking-[-0.035em] sm:text-[40px] bajo:sm:text-[34px]'
                    )}
                  >
                    {title}
                  </h1>
                  {headerBadge ? <div className="flex shrink-0">{headerBadge}</div> : null}
                </div>
                {description ? (
                  <p className={cn('max-w-3xl text-muted-foreground', compactHeader ? 'mt-1 text-sm' : 'mt-2.5 text-base leading-6')}>{description}</p>
                ) : null}
                </div>
                {titleAside}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                {headerCenter || hideSearch ? null : (
                  <button
                    type="button"
                    onClick={openSearch}
                    aria-label="Buscar"
                    className={cn(
                      'hidden h-10 items-center gap-2.5 rounded-lg bg-card px-3 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex',
                      compactHeader ? 'w-10 justify-center px-0' : 'w-64'
                    )}
                  >
                    <Search className="h-[18px] w-[18px] shrink-0" />
                    {compactHeader ? null : (
                      <>
                        <span className="flex-1 truncate whitespace-nowrap text-left">Buscar paciente o tutor</span>
                        <kbd className="rounded-md bg-muted px-1.5 py-0.5 font-sans text-xs font-semibold text-muted-foreground">Ctrl K</kbd>
                      </>
                    )}
                  </button>
                )}
                {actions}
                {visibleQuickActions.length > 0 ? <QuickCreateMenu actions={visibleQuickActions} /> : null}
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
    </HeaderSlotContext.Provider>
    </AdminSearchContext.Provider>
  )
}
