import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  ChevronDown,
  FileText,
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
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/features/auth/useAuth'
import { PLAN_META } from '@/features/dashboard/dashboardUtils'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { key: 'finanzas', label: 'Caja y facturacion', to: '/finanzas', icon: Receipt },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint },
  { key: 'historias', label: 'Historias', to: '/historias', icon: FileText },
  { key: 'antecedentes', label: 'Antecedentes', to: '/antecedentes', icon: HeartPulse },
  { key: 'configuracion', label: 'Clinica', to: '/configuracion', icon: Building2 },
  { key: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: Users },
  { key: 'auditoria', label: 'Auditoria', to: '/auditoria', icon: History },
  { key: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes },
  { key: 'planes', label: 'Planes', to: '/planes', icon: ShieldCheck },
]

const NAV_GROUPS = [
  {
    key: 'operacion',
    label: 'Operacion diaria',
    items: ['dashboard', 'finanzas', 'agenda', 'pacientes', 'historias', 'antecedentes'],
  },
  {
    key: 'administracion',
    label: 'Administracion',
    items: ['inventario', 'usuarios', 'configuracion'],
  },
  {
    key: 'control',
    label: 'Control y soporte',
    items: ['auditoria', 'planes'],
  },
]

const NAV_ITEMS_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

function NavLink({ item, active }) {
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      className={`flex items-center justify-between border px-3 py-3 text-sm transition ${
        active
          ? 'border-cyan-500 bg-cyan-500/10 text-white'
          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center border ${
            active
              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
              : 'border-slate-700 bg-slate-900 text-slate-300'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-medium">{item.label}</span>
      </span>
      {active ? <ArrowRight className="h-4 w-4 text-cyan-200" /> : null}
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
}) {
  const clinica = useAuthStore((state) => state.clinica)
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const { logout } = useLogout()
  const [openGroups, setOpenGroups] = useState(() =>
    NAV_GROUPS.reduce((acc, group) => {
      acc[group.key] = group.items.includes(currentKey) || group.key === 'operacion'
      return acc
    }, {})
  )

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clinica'
  const ubicacionClinica = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')
  const plan = PLAN_META[suscripcion?.plan] || PLAN_META.inicio

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border border-slate-900 bg-slate-950 px-4 py-5 text-white shadow-sm">
            <div className="border-b border-slate-800 pb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-slate-700 bg-slate-900 text-cyan-200">
                <Stethoscope className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Panel administrativo
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-white">{nombreClinica}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {ubicacionClinica || 'Ubicacion pendiente por completar'}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {NAV_GROUPS.map((group) => {
                const groupItems = group.items
                  .map((itemKey) => NAV_ITEMS_BY_KEY[itemKey])
                  .filter(Boolean)
                const isOpen = openGroups[group.key] || group.items.includes(currentKey)

                return (
                  <div key={group.key} className="border border-slate-800 bg-slate-950">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((current) => ({
                          ...current,
                          [group.key]: !current[group.key],
                        }))
                      }
                      className="flex w-full items-center justify-between px-3 py-3 text-left"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 border-t border-slate-800 p-3">
                        {groupItems.map((item) => (
                          <NavLink key={item.key} item={item} active={currentKey === item.key} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
              <div className="border border-slate-800 bg-slate-900 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Plan actual
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{plan.nombre}</p>
              </div>
              <div className="border border-slate-800 bg-slate-900 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Usuario
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{usuario?.nombre || 'Sin nombre'}</p>
                <p className="mt-1 text-xs text-slate-400">{usuario?.email || 'Sin email principal'}</p>
              </div>
              {asideNote ? (
                <div className="border border-slate-800 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-300">
                  {asideNote}
                </div>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-2 border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </aside>

          <div className="space-y-5">
            <header className="border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Vista administrativa
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${plan.tone}`}>
                    {plan.nombre}
                  </span>
                  {headerBadge ? headerBadge : null}
                  {actions}
                </div>
              </div>
            </header>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
