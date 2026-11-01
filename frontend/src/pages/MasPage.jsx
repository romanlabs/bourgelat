import { Link } from 'react-router-dom'
import { ChevronRight, LogOut, Moon, Sun } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NAV_ITEMS_BY_KEY, NAV_SECTIONS, pestanasMovil } from '@/components/layout/navegacion'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useLogout } from '@/features/auth/useAuth'
import { canAccessModule, getUserRoles } from '@/lib/permissions'

const ROLES = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepción',
  auxiliar: 'Auxiliar',
  facturador: 'Facturación',
  superadmin: 'Administrador de la plataforma',
}

const iniciales = (texto = '') =>
  texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('')

// «Más» del celular: lo que no cabe en la barra inferior, la cuenta y salir.
export default function MasPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const dark = useThemeStore((state) => state.dark)
  const toggleDark = useThemeStore((state) => state.toggleDark)
  const { logout } = useLogout()

  const enBarra = new Set(pestanasMovil(usuario))
  const secciones = NAV_SECTIONS.map((seccion) => ({
    ...seccion,
    items: seccion.items
      .filter((key) => !enBarra.has(key))
      .map((key) => NAV_ITEMS_BY_KEY[key])
      .filter((item) => item && (item.key === 'planes' || canAccessModule(usuario, item.key))),
  })).filter((seccion) => seccion.items.length > 0)

  const roles = getUserRoles(usuario).map((rol) => ROLES[rol]).filter(Boolean).join(' · ')

  return (
    <AdminShell
      currentKey="mas"
      title="Más"
      description={clinica?.nombreComercial || clinica?.nombre || undefined}
    >
      <Link
        to="/perfil"
        className="flex items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand text-base font-bold text-foreground">
          {usuario?.foto ? <img src={usuario.foto} alt="" className="h-full w-full object-cover" /> : iniciales(usuario?.nombre || usuario?.email)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-semibold text-foreground">{usuario?.nombre || 'Mi perfil'}</span>
          <span className="truncate text-sm text-muted-foreground">{roles || 'Mi perfil'}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      {secciones.map((seccion) => (
        <section key={seccion.key} aria-labelledby={`mas-${seccion.key}`} className="space-y-2">
          <h2 id={`mas-${seccion.key}`} className="px-1 text-sm font-semibold text-muted-foreground">
            {seccion.label}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
            {seccion.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-semibold text-foreground">{item.label}</span>
                      <span className="truncate text-sm text-muted-foreground">{item.descripcion}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
        <button
          type="button"
          onClick={toggleDark}
          className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left text-[15px] font-semibold text-foreground transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          {dark ? <Sun className="h-5 w-5 text-muted-foreground" aria-hidden="true" /> : <Moon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
          {dark ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left text-[15px] font-semibold text-danger transition hover:bg-danger-soft focus-visible:bg-danger-soft focus-visible:outline-none"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </AdminShell>
  )
}
