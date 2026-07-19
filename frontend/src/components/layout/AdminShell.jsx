import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  Building2,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  HeartPulse,
  History,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'
import { PLAN_META } from '@/features/dashboard/dashboardUtils'
import { useLogout } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { ALL_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS, ROL_ACTION_ORDER } from './quickActions'

const ROL_LABELS_SIDEBAR = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepcionista',
  auxiliar: 'Auxiliar',
  facturador: 'Facturador',
  superadmin: 'Superadmin',
}

const SIDEBAR_STORAGE_KEY = 'bourgelat-admin-sidebar-collapsed'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint },
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
    items: ['dashboard', 'agenda', 'pacientes', 'antecedentes'],
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

function SidebarLink({ item, active, collapsed = false }) {
  const Icon = item.icon

  return (
    <div className="group relative">
      <Link
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150',
          collapsed ? 'h-10 justify-center px-0' : 'gap-2.5 px-3 py-2',
          active
            ? 'bg-[#91e7e0]/10 text-white'
            : 'text-[#91e7e0]/45 hover:bg-[#081827] hover:text-white'
        )}
      >
        {active && !collapsed ? (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#91e7e0]" />
        ) : null}
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            active ? 'text-[#91e7e0]' : 'text-[#91e7e0]/40 group-hover:text-[#91e7e0]/70'
          )}
        />
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
      className={cn(
        'group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition',
        item.cardHover || 'hover:border-primary/30 hover:bg-primary/5'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition',
          item.accent || 'bg-muted text-foreground'
        )}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="truncate text-sm font-semibold text-card-foreground">{item.label}</p>
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
}) {
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const { logout } = useLogout()
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
                'flex items-center border-b border-white/10 px-4 py-3',
                isSidebarCollapsed ? 'justify-center' : 'gap-2.5'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#91e7e0]/10 text-[#91e7e0]">
                <Stethoscope className="h-4 w-4" />
              </div>

              {!isSidebarCollapsed ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{nombreClinica}</p>
                  <p className="truncate text-[11px] text-[#91e7e0]/40">
                    {ubicacionClinica || 'Operacion clinica'}
                  </p>
                </div>
              ) : null}

              {!isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#91e7e0]/40 transition hover:bg-[#081827] hover:text-[#91e7e0]"
                  title="Contraer barra lateral"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-3 py-3">
              {isSidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="mb-3 inline-flex h-9 w-9 self-center items-center justify-center rounded-lg text-[#91e7e0]/40 transition hover:bg-[#081827] hover:text-[#91e7e0]"
                  title="Expandir barra lateral"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              ) : null}

              <nav className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                {NAV_SECTIONS.map((section) => {
                  const sectionItems = section.items
                    .map((itemKey) => NAV_ITEMS_BY_KEY[itemKey])
                    .filter(Boolean)

                  return (
                    <section key={section.key}>
                      {!isSidebarCollapsed ? (
                        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#91e7e0]/30">
                          {section.label}
                        </p>
                      ) : null}

                      <div className="space-y-0.5">
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

              <div className="mt-auto shrink-0 border-t border-white/10 pt-3">
                {isSidebarCollapsed ? (
                  <div className="flex flex-col items-center gap-2">
                    <Link
                      to="/perfil"
                      title={`${usuario?.nombre || 'Usuario'} · Mi perfil`}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#081827] text-xs font-semibold text-[#91e7e0] transition hover:ring-2 hover:ring-[#91e7e0]/40"
                    >
                      {usuario?.foto ? (
                        <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        usuarioIniciales
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      title="Cerrar sesion"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#91e7e0]/50 transition hover:bg-[#081827] hover:text-[#91e7e0]"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                    <Link
                      to="/perfil"
                      title="Mi perfil"
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition hover:bg-[#081827]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#081827] text-xs font-semibold text-[#91e7e0]">
                        {usuario?.foto ? (
                          <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
                        ) : (
                          usuarioIniciales
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {usuario?.nombre || 'Sin nombre'}
                        </p>
                        <p className="truncate text-[11px] text-[#91e7e0]/40">
                          {usuario?.cargo || ROL_LABELS_SIDEBAR[usuario?.rol] || `Plan ${plan.nombre}`}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      title="Cerrar sesion"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#91e7e0]/40 transition hover:bg-[#081827] hover:text-red-400"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-5">
            <header className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_4px_18px_rgba(8,25,39,0.05)]">
              <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h1 className="font-display text-xl font-semibold leading-tight text-foreground sm:text-2xl">{title}</h1>
                    {headerBadge ? <div className="flex shrink-0">{headerBadge}</div> : null}
                  </div>
                  {description ? (
                    <p className="mt-1 max-w-4xl text-sm leading-5 text-muted-foreground">{description}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                  {actions}
                  <Link
                    to="/perfil"
                    title={`${usuario?.nombre || 'Mi perfil'} · Ver perfil`}
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-sidebar text-xs font-semibold text-[#91e7e0] shadow-sm transition hover:ring-2 hover:ring-primary/40"
                  >
                    {usuario?.foto ? (
                      <img src={usuario.foto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      usuarioIniciales
                    )}
                  </Link>
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
              <section className="rounded-2xl border border-border bg-card p-3.5 shadow-[0_4px_24px_rgba(8,25,39,0.06)] lg:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Acciones rapidas
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed((current) => !current)}
                    className="hidden items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
                  >
                    {isSidebarCollapsed ? (
                      <ChevronsRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    )}
                    {isSidebarCollapsed ? 'Expandir menu' : 'Contraer menu'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
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
