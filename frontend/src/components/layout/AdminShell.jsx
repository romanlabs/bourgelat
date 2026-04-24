import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  Building2,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  HeartPulse,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Moon,
  PawPrint,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Sun,
  Users,
} from 'lucide-react'
import { PLAN_META } from '@/features/dashboard/dashboardUtils'
import { useLogout } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'

const SIDEBAR_STORAGE_KEY = 'bourgelat-admin-sidebar-collapsed'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint },
  { key: 'historias', label: 'Historias', to: '/historias', icon: FileText },
  { key: 'antecedentes', label: 'Antecedentes', to: '/antecedentes', icon: HeartPulse },
  { key: 'finanzas', label: 'Caja', to: '/finanzas', icon: Receipt },
  { key: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes },
  { key: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { key: 'configuracion', label: 'Clinica', to: '/configuracion', icon: Building2 },
  { key: 'auditoria', label: 'Auditoria', to: '/auditoria', icon: History },
  { key: 'planes', label: 'Planes', to: '/planes', icon: ShieldCheck },
]

const NAV_SECTIONS = [
  {
    key: 'operacion',
    label: 'Operacion diaria',
    items: ['dashboard', 'agenda', 'pacientes', 'historias', 'antecedentes'],
  },
  {
    key: 'gestion',
    label: 'Gestion administrativa',
    items: ['finanzas', 'inventario', 'usuarios'],
  },
  {
    key: 'control',
    label: 'Configuracion y control',
    items: ['configuracion', 'auditoria', 'planes'],
  },
]

const NAV_ITEMS_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

const DEFAULT_QUICK_ACTIONS = [
  {
    key: 'facturar',
    label: 'Facturar',
    detail: 'Entrar a caja y emitir una factura sin buscar el modulo.',
    to: '/finanzas',
    icon: Receipt,
  },
  {
    key: 'paciente',
    label: 'Nuevo paciente',
    detail: 'Registrar tutor y paciente desde el flujo operativo.',
    to: '/pacientes',
    icon: PawPrint,
  },
  {
    key: 'historia',
    label: 'Historia clinica',
    detail: 'Abrir consulta y documentar el caso sin rodeos.',
    to: '/historias',
    icon: FileText,
  },
  {
    key: 'agenda',
    label: 'Nueva cita',
    detail: 'Programar o reorganizar la agenda del dia.',
    to: '/agenda',
    icon: CalendarClock,
  },
]

function SidebarLink({ item, active, collapsed = false }) {
  const Icon = item.icon

  return (
    <div className="group relative">
      <Link
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center rounded-xl border text-sm font-medium transition-all duration-200',
          collapsed ? 'h-12 justify-center px-0' : 'gap-3 px-3.5 py-2.5',
          active
            ? 'border-[#91e7e0]/50 bg-[#91e7e0]/10 text-white shadow-[0_10px_30px_rgba(92,232,220,0.18)]'
            : 'border-transparent text-[#91e7e0]/40 hover:border-[#0c2235] hover:bg-[#081827] hover:text-white'
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition',
            active
              ? 'border-[#91e7e0]/30 bg-[#91e7e0]/10 text-[#91e7e0]'
              : 'border-[#0c2235] bg-[#081827] text-[#91e7e0]/40'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>

      {collapsed ? (
        <div className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg group-hover:block">
          {item.label}
        </div>
      ) : null}
    </div>
  )
}

function QuickActionLink({ item }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      className="group rounded-2xl border border-border bg-card p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-foreground transition group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
        </div>
      </div>
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
  asideNote,
  quickActions = DEFAULT_QUICK_ACTIONS,
  showQuickActions = false,
}) {
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const { logout } = useLogout()
  const dark = useThemeStore((state) => state.dark)
  const toggleDark = useThemeStore((state) => state.toggleDark)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? '1' : '0')
    } catch {
      // noop
    }
  }, [isSidebarCollapsed])

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clinica'
  const ubicacionClinica = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')
  const plan = PLAN_META[suscripcion?.plan] || PLAN_META.inicio
  const visibleQuickActions = showQuickActions ? quickActions : []
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
    <div className="admin-workspace min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1720px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row">
          <aside
            className={cn(
              'hidden shrink-0 rounded-2xl border border-[#0c2235] bg-[#06111c] text-white shadow-[0_22px_60px_rgba(2,8,14,0.45)] transition-all duration-300 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col',
              isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
            )}
          >
            <div
              className={cn(
                'flex items-center border-b border-white/10 px-4 py-3.5',
                isSidebarCollapsed ? 'justify-center' : 'gap-3'
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#91e7e0]/10 text-[#91e7e0]">
                <Stethoscope className="h-5 w-5" />
              </div>

              {!isSidebarCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{nombreClinica}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {ubicacionClinica || 'Operacion clinica'}
                  </p>
                </div>
              ) : null}

              {!isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#0c2235] bg-[#081827] text-[#91e7e0]/50 transition hover:border-[#91e7e0]/30 hover:bg-[#0c2235] hover:text-[#91e7e0]"
                  title="Contraer barra lateral"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-3 py-3.5">
              {isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="mb-4 inline-flex h-10 w-10 self-center items-center justify-center rounded-xl border border-[#0c2235] bg-[#081827] text-[#91e7e0]/50 transition hover:border-[#91e7e0]/30 hover:bg-[#0c2235] hover:text-[#91e7e0]"
                  title="Expandir barra lateral"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              ) : null}

              <nav className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
                {NAV_SECTIONS.map((section) => {
                  const sectionItems = section.items
                    .map((itemKey) => NAV_ITEMS_BY_KEY[itemKey])
                    .filter(Boolean)

                  return (
                    <section key={section.key}>
                      {!isSidebarCollapsed ? (
                        <p className="mb-2.5 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {section.label}
                        </p>
                      ) : null}

                      <div className="space-y-1.5">
                        {sectionItems.map((item) => (
                          <SidebarLink
                            key={item.key}
                            item={item}
                            active={currentKey === item.key}
                            collapsed={isSidebarCollapsed}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
              </nav>

              <div className="mt-auto border-t border-white/10 pt-4">
                {asideNote && !isSidebarCollapsed ? (
                  <details className="mb-3 overflow-hidden rounded-xl border border-[#0c2235] bg-[#020d16]/80">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#91e7e0]/50">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#06111c] text-[#91e7e0]/50">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                      Guia del modulo
                    </summary>
                    <p className="border-t border-[#0c2235] px-3 py-2 text-[11px] leading-5 text-[#91e7e0]/40">
                      {asideNote}
                    </p>
                  </details>
                ) : null}

                <div
                  className={cn(
                    'rounded-2xl border border-white/8 bg-[#020d16]/80 p-3',
                    isSidebarCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'
                  )}
                >
                  {isSidebarCollapsed ? (
                    <>
                      <div
                        title={`Plan actual: ${plan.nombre}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#91e7e0]/10 text-[#91e7e0]"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div
                        title={usuario?.nombre || 'Usuario principal'}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#081827] text-sm font-semibold text-[#91e7e0]"
                      >
                        {usuarioIniciales}
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        title="Cerrar sesion"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#0c2235] bg-[#06111c] text-[#91e7e0]/70 transition hover:border-[#91e7e0]/30 hover:bg-[#081827] hover:text-[#91e7e0]"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Plan actual
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">{plan.nombre}</p>
                      </div>

                      <div className="rounded-xl border border-[#0c2235]/80 bg-[#04101a] p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#081827] text-sm font-semibold text-[#91e7e0]">
                            {usuarioIniciales}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {usuario?.nombre || 'Sin nombre'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {usuario?.email || 'Sin email principal'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={logout}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0c2235] bg-[#06111c] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#91e7e0]/25 hover:bg-[#081827]"
                      >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesion
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-5">
            <header className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_4px_18px_rgba(8,25,39,0.05)]">
              <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">{title}</h1>
                    {headerBadge ? <div className="flex shrink-0">{headerBadge}</div> : null}
                  </div>
                  {description ? (
                    <p className="mt-1 max-w-4xl text-sm leading-5 text-muted-foreground">{description}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  {actions}
                  <button
                    type="button"
                    onClick={toggleDark}
                    aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-border hover:bg-muted hover:text-foreground"
                  >
                    <Sun className={`absolute h-4 w-4 transition-all duration-200 ${dark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
                    <Moon className={`absolute h-4 w-4 transition-all duration-200 ${dark ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`} />
                  </button>
                </div>
              </div>

              <div className="border-t border-border/80 px-4 py-3 lg:hidden">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const active = currentKey === item.key

                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
                          active
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </header>

            {visibleQuickActions.length > 0 ? (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_24px_rgba(8,25,39,0.06)] lg:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Acciones rapidas
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Lo que el equipo debe tener a la vista cuando necesita operar rapido.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed((current) => !current)}
                    className="hidden items-center gap-2 self-start rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-border hover:bg-muted lg:inline-flex"
                  >
                    {isSidebarCollapsed ? (
                      <ChevronsRight className="h-4 w-4" />
                    ) : (
                      <ChevronsLeft className="h-4 w-4" />
                    )}
                    {isSidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-4">
                  {visibleQuickActions.map((item) => (
                    <QuickActionLink key={item.key} item={item} />
                  ))}
                </div>
              </section>
            ) : null}

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
