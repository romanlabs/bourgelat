import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Crown,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/features/auth/useAuth'

const NAV_ITEMS = [
  { key: 'resumen', label: 'Resumen global', href: '#resumen', icon: LayoutDashboard },
  { key: 'suscripciones', label: 'Suscripciones', href: '#suscripciones', icon: Crown },
  { key: 'gobierno', label: 'Gobierno DIAN', href: '#gobierno', icon: ShieldAlert },
  { key: 'operacion', label: 'Operacion', href: '#operacion', icon: ReceiptText },
]

function NavAnchor({ item, active }) {
  const Icon = item.icon

  return (
    <a
      href={item.href}
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
    </a>
  )
}

export default function SuperadminShell({
  title,
  description,
  children,
  actions,
  headerBadge,
  currentKey = 'resumen',
  asideNote,
}) {
  const usuario = useAuthStore((state) => state.usuario)
  const { logout } = useLogout()

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1660px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="border border-slate-900 bg-slate-950 px-4 py-5 text-white shadow-sm">
            <div className="border-b border-slate-800 pb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-slate-700 bg-slate-900 text-cyan-200">
                <Stethoscope className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Control del software
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Bourgelat</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Consola exclusiva de superadmin para operar el SaaS, revisar crecimiento y
                controlar configuraciones sensibles.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {NAV_ITEMS.map((item) => (
                <NavAnchor key={item.key} item={item} active={currentKey === item.key} />
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
              <div className="border border-slate-800 bg-slate-900 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Rol activo
                </p>
                <p className="mt-2 text-sm font-semibold text-white">Superadmin</p>
              </div>
              <div className="border border-slate-800 bg-slate-900 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Sesion
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{usuario?.nombre || 'Sin nombre'}</p>
                <p className="mt-1 text-xs text-slate-400">{usuario?.email || 'Sin email principal'}</p>
              </div>
              {asideNote ? (
                <div className="border border-slate-800 bg-slate-900 px-3 py-3 text-sm leading-6 text-slate-300">
                  {asideNote}
                </div>
              ) : null}
              <Link
                to="/"
                className="inline-flex w-full items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Ver sitio publico
              </Link>
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
                    Vista exclusiva
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Acceso solo global
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
