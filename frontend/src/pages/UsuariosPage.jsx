import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CircleAlert,
  Mail,
  PencilLine,
  Phone,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatNumber, objectToChartData, toNumber } from '@/features/dashboard/dashboardUtils'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'veterinario', label: 'Veterinario' },
  { value: 'recepcionista', label: 'Recepcionista' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'facturador', label: 'Facturador' },
]

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((role) => [role.value, role.label]))

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
]

const DEFAULT_CREATE_FORM = {
  nombre: '',
  email: '',
  password: '',
  rol: 'recepcionista',
  telefono: '',
  rolesAdicionales: [],
}

const DEFAULT_EDIT_FORM = {
  id: '',
  nombre: '',
  email: '',
  rol: 'recepcionista',
  telefono: '',
  rolesAdicionales: [],
  activo: true,
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
const phoneRegex = /^3\d{9}$/

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const normalizeEmail = (value) => value.trim().toLowerCase()
const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10)
const normalizeRoles = (roles, primaryRole) =>
  [...new Set((Array.isArray(roles) ? roles : []).filter((role) => role && role !== primaryRole))]

const getRoleLabel = (role) => ROLE_LABELS[role] || role || 'Sin rol'

const hasAdminAccess = (user) => hasAnyRole(user, ['admin'])

const hasVeterinaryAccess = (user) => hasAnyRole(user, ['veterinario'])

const buildEditForm = (user) => ({
  id: user?.id || '',
  nombre: user?.nombre || '',
  email: user?.email || '',
  rol: user?.rol || 'recepcionista',
  telefono: user?.telefono || '',
  rolesAdicionales: Array.isArray(user?.rolesAdicionales) ? user.rolesAdicionales : [],
  activo: Boolean(user?.activo),
})

const formatLastAccess = (value) => {
  if (!value) return 'Sin acceso registrado'

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function RoleChecklist({ primaryRole, value, onChange, disabled = false }) {
  const availableRoles = ROLE_OPTIONS.filter((role) => role.value !== primaryRole)

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {availableRoles.map((role) => {
        const checked = value.includes(role.value)

        return (
          <label
            key={role.value}
            className={`flex items-center gap-3 border px-3 py-3 text-sm transition ${
              disabled
                ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                : checked
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => {
                const nextRoles = checked
                  ? value.filter((current) => current !== role.value)
                  : [...value, role.value]
                onChange(normalizeRoles(nextRoles, primaryRole))
              }}
            />
            {role.label}
          </label>
        )
      })}
    </div>
  )
}

function RoleBadges({ user }) {
  const roles = [user.rol, ...(Array.isArray(user.rolesAdicionales) ? user.rolesAdicionales : [])]

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role, index) => (
        <StatusPill
          key={`${user.id}-${role}-${index}`}
          tone={
            role === 'admin'
              ? 'border-violet-200 bg-violet-50 text-violet-700'
              : role === 'veterinario'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-muted text-foreground'
          }
        >
          {getRoleLabel(role)}
        </StatusPill>
      ))}
    </div>
  )
}

function PasswordChecklist({ password, visible }) {
  if (!visible) return null

  const rules = [
    { id: 'length', label: 'Entre 8 y 72 caracteres', valid: /^.{8,72}$/.test(password) },
    { id: 'upper', label: 'Una mayuscula', valid: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Una minuscula', valid: /[a-z]/.test(password) },
    { id: 'number', label: 'Un numero', valid: /\d/.test(password) },
    { id: 'special', label: 'Un caracter especial', valid: /[^A-Za-z0-9]/.test(password) },
  ]

  return (
    <div className="border border-border bg-muted px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Requisitos de acceso
      </p>
      <div className="mt-3 grid gap-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{rule.label}</span>
            <span className={rule.valid ? 'text-emerald-700' : 'text-muted-foreground'}>
              {rule.valid ? 'Cumple' : 'Pendiente'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RestrictedUsersPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Usuarios y roles"
          subtitle="Este modulo se reserva para administracion de la clinica."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene permisos para administrar usuarios, roles ni estados del equipo.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()

  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('todos')
  const [rolFiltro, setRolFiltro] = useState('todos')
  const [activeSection, setActiveSection] = useState('equipo')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM)
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM)
  const [showPasswordChecklist, setShowPasswordChecklist] = useState(false)

  const busquedaDiferida = useDeferredValue(buscar.trim().toLowerCase())
  const roleFeatureEnabled =
    Array.isArray(suscripcion?.funcionalidades) && suscripcion.funcionalidades.includes('roles_base')
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin'])
  const puedeVerModulo = rolPermitido && roleFeatureEnabled

  useEffect(() => {
    document.title = 'Usuarios | Bourgelat'
  }, [])

  const usuariosQuery = useQuery({
    queryKey: ['usuarios-clinica'],
    queryFn: usuariosApi.obtenerUsuarios,
    enabled: puedeVerModulo,
    placeholderData: (previousData) => previousData,
  })

  const crearUsuarioMutation = useMutation({
    mutationFn: usuariosApi.crearUsuario,
    onSuccess: (data) => {
      toast.success(data?.message || 'Usuario creado exitosamente')
      setCreateForm(DEFAULT_CREATE_FORM)
      setShowPasswordChecklist(false)
      setActiveSection('equipo')
      queryClient.invalidateQueries({ queryKey: ['usuarios-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el usuario.'))
    },
  })

  const editarUsuarioMutation = useMutation({
    mutationFn: ({ id, payload }) => usuariosApi.editarUsuario(id, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Usuario actualizado exitosamente')
      if (data?.usuario) {
        setSelectedUserId(data.usuario.id)
        setEditForm(buildEditForm(data.usuario))
        if (data.usuario.id === usuario?.id) {
          useAuthStore.setState((state) => ({
            usuario: {
              ...state.usuario,
              nombre: data.usuario.nombre,
              email: data.usuario.email,
              telefono: data.usuario.telefono,
            },
          }))
        }
      }
      queryClient.invalidateQueries({ queryKey: ['usuarios-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar el usuario.'))
    },
  })

  const toggleUsuarioMutation = useMutation({
    mutationFn: ({ id }) => usuariosApi.toggleUsuario(id),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Estado del usuario actualizado')
      if (variables.id === selectedUserId) {
        setEditForm((current) => ({ ...current, activo: Boolean(data?.activo) }))
      }
      queryClient.invalidateQueries({ queryKey: ['usuarios-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-general'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible cambiar el estado del usuario.'))
    },
  })

  const usuarios = useMemo(() => usuariosQuery.data?.usuarios || [], [usuariosQuery.data?.usuarios])
  const selectedUser = useMemo(
    () => usuarios.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, usuarios]
  )

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((item) => {
      const coincideTexto =
        !busquedaDiferida ||
        [item.nombre, item.email, item.telefono]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(busquedaDiferida))

      const coincideEstado =
        estado === 'todos' || (estado === 'activos' ? item.activo : !item.activo)

      const coincideRol =
        rolFiltro === 'todos' ||
        item.rol === rolFiltro ||
        (Array.isArray(item.rolesAdicionales) && item.rolesAdicionales.includes(rolFiltro))

      return coincideTexto && coincideEstado && coincideRol
    })
  }, [busquedaDiferida, estado, rolFiltro, usuarios])

  const activos = useMemo(() => usuarios.filter((item) => item.activo), [usuarios])
  const totalAdministrativos = useMemo(
    () => activos.filter((item) => hasAdminAccess(item)).length,
    [activos]
  )
  const totalVeterinarios = useMemo(
    () => activos.filter((item) => hasVeterinaryAccess(item)).length,
    [activos]
  )
  const limiteUsuarios = toNumber(suscripcion?.limiteUsuarios)
  const cupoDisponible =
    limiteUsuarios === null ? null : Math.max(limiteUsuarios - activos.length, 0)

  const roleDistribution = useMemo(() => {
    const record = activos.reduce((acc, item) => {
      acc[item.rol] = (acc[item.rol] || 0) + 1
      return acc
    }, {})
    return objectToChartData(record, ROLE_LABELS)
  }, [activos])

  const statusDistribution = useMemo(
    () => [
      { key: 'activos', name: 'Activos', value: activos.length, color: '#0f766e' },
      {
        key: 'inactivos',
        name: 'Inactivos',
        value: Math.max(usuarios.length - activos.length, 0),
        color: '#cbd5e1',
      },
    ],
    [activos.length, usuarios.length]
  )

  const tableRows = useMemo(
    () =>
      usuariosFiltrados.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        email: item.email,
        telefono: item.telefono || 'Sin celular laboral',
        rol: item.rol,
        rolesAdicionales: Array.isArray(item.rolesAdicionales) ? item.rolesAdicionales : [],
        activo: item.activo,
        ultimoAcceso: item.ultimoAcceso,
        raw: item,
      })),
    [usuariosFiltrados]
  )

  const esUsuarioActualSeleccionado = selectedUser?.id === usuario?.id
  const createPasswordValid = passwordRegex.test(createForm.password)

  const handleCreateUser = (event) => {
    event.preventDefault()

    const payload = {
      nombre: createForm.nombre.trim(),
      email: normalizeEmail(createForm.email),
      password: createForm.password,
      rol: createForm.rol,
      telefono: normalizePhone(createForm.telefono),
      rolesAdicionales: normalizeRoles(createForm.rolesAdicionales, createForm.rol),
    }

    if (payload.nombre.length < 3) {
      toast.error('El nombre del colaborador debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo corporativo valido para el usuario.')
      return
    }

    if (!createPasswordValid) {
      toast.error('La contrasena inicial aun no cumple los requisitos de seguridad.')
      return
    }

    if (payload.telefono && !phoneRegex.test(payload.telefono)) {
      toast.error('El celular laboral debe tener 10 digitos colombianos y comenzar por 3.')
      return
    }

    crearUsuarioMutation.mutate({
      ...payload,
      telefono: payload.telefono || undefined,
    })
  }

  const handleUpdateUser = (event) => {
    event.preventDefault()

    if (!selectedUser) {
      toast.error('Selecciona primero un usuario desde la tabla.')
      return
    }

    const payload = {
      nombre: editForm.nombre.trim(),
      email: normalizeEmail(editForm.email),
      telefono: normalizePhone(editForm.telefono),
    }

    if (!esUsuarioActualSeleccionado) {
      payload.rol = editForm.rol
      payload.rolesAdicionales = normalizeRoles(editForm.rolesAdicionales, editForm.rol)
    }

    if (payload.nombre.length < 3) {
      toast.error('El nombre del colaborador debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo valido para actualizar el usuario.')
      return
    }

    if (payload.telefono && !phoneRegex.test(payload.telefono)) {
      toast.error('El celular laboral debe tener 10 digitos colombianos y comenzar por 3.')
      return
    }

    editarUsuarioMutation.mutate({
      id: selectedUser.id,
      payload: {
        ...payload,
        telefono: payload.telefono || '',
      },
    })
  }

  if (!rolPermitido) {
    return <RestrictedUsersPage />
  }

  return (
    <AdminShell
      currentKey="usuarios"
      title="Usuarios y roles"
      description="Centro administrativo para crear equipo, ordenar permisos, revisar cupos del plan y mantener una estructura limpia de acceso por clinica."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">
          Control del equipo
        </StatusPill>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver al dashboard
          </Link>
          <Link
            to="/planes"
            className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Revisar plan
          </Link>
        </div>
      }
      asideNote="Aqui se administra el equipo real de la clinica: altas, roles, estado activo y cupo disponible frente a la suscripcion."
    >
      {!roleFeatureEnabled ? (
        <EmptyModuleState
          title="Usuarios y roles no disponibles en el plan actual"
          body="El control del equipo hace parte del flujo base del sistema. Si esta area no aparece habilitada, conviene revisar la configuracion comercial de la clinica."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {usuariosQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {getErrorMessage(usuariosQuery.error, 'No fue posible cargar el equipo de la clinica.')}
            </div>
          ) : null}

          <DashboardPanel
            title="Organiza la administracion del equipo"
            subtitle="Separamos lectura, alta y edicion para que cada tarea sea mas clara y no obligue a recorrer toda la pantalla."
            action={
              <StatusPill tone="border-border bg-muted text-foreground">
                {limiteUsuarios === null
                  ? 'Sin limite de usuarios'
                  : `${formatNumber(Math.max(cupoDisponible, 0))} cupos disponibles`}
              </StatusPill>
            }
          >
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                {
                  id: 'equipo',
                  label: 'Equipo actual',
                  helper: 'Tabla, filtros y lectura rapida del estado del equipo.',
                },
                {
                  id: 'crear',
                  label: 'Crear usuario',
                  helper: 'Alta administrativa con rol, celular laboral y contrasena inicial.',
                },
                {
                  id: 'editar',
                  label: 'Editar usuario',
                  helper: selectedUser
                    ? `Editando a ${selectedUser.nombre}.`
                    : 'Selecciona un colaborador desde la tabla para habilitar esta vista.',
                },
              ].map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`border px-4 py-4 text-left transition ${
                    activeSection === section.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted hover:border-border hover:bg-card'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {section.label}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.helper}</p>
                </button>
              ))}
            </div>
          </DashboardPanel>

          <div className="grid gap-4 xl:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Usuarios activos"
              value={formatNumber(activos.length)}
              helper="Equipo actualmente habilitado para ingresar al sistema."
              tone="text-primary"
            />
            <KpiCard
              icon={ShieldCheck}
              label="Acceso administrativo"
              value={formatNumber(totalAdministrativos)}
              helper="Usuarios activos con capacidad de administracion."
              tone="text-violet-700"
            />
            <KpiCard
              icon={Stethoscope}
              label="Equipo clinico"
              value={formatNumber(totalVeterinarios)}
              helper="Profesionales que pueden operar consulta y agenda medica."
              tone="text-emerald-700"
            />
            <KpiCard
              icon={CircleAlert}
              label="Cupo disponible"
              value={limiteUsuarios === null ? 'Sin limite' : formatNumber(cupoDisponible)}
              helper={
                limiteUsuarios === null
                  ? 'La suscripcion actual no limita usuarios activos.'
                  : `${formatNumber(activos.length)} de ${formatNumber(limiteUsuarios)} usuarios en uso.`
              }
              tone="text-amber-700"
            />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[420px_420px_minmax(0,1fr)]">
            <DonutCard
              title="Roles principales"
              subtitle="Composicion actual del equipo activo por cargo principal."
              data={roleDistribution}
              centerLabel="Activos"
              centerValue={formatNumber(activos.length)}
              formatter={formatNumber}
              emptyMessage="Aun no hay roles activos para mostrar."
            />
            <DonutCard
              title="Estado del equipo"
              subtitle="Lectura rapida entre usuarios activos e inactivos."
              data={statusDistribution}
              centerLabel="Total"
              centerValue={formatNumber(usuarios.length)}
              formatter={formatNumber}
              emptyMessage="Aun no hay estados para mostrar."
            />
            <DashboardPanel
              title="Criterio de control"
              subtitle="Lo importante en esta vista es sostener acceso util, sin sobrecargar el equipo ni romper el ultimo admin de la clinica."
            >
              <div className="grid gap-4">
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Usa <span className="font-semibold text-foreground">Administrador</span> solo para quien realmente gestiona configuracion, suscripcion y equipo.
                </div>
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  Si un usuario necesita apoyar agenda o consulta, agrega <span className="font-semibold text-foreground">roles adicionales</span> en vez de crear cuentas duplicadas.
                </div>
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  La plataforma ya bloquea desactivar o degradar al ultimo administrador activo para evitar dejar la clinica sin control.
                </div>
              </div>
            </DashboardPanel>
          </div>

          <div
            className={
              activeSection === 'crear'
                ? 'grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_420px]'
                : 'grid gap-5'
            }
          >
            <DashboardPanel
              title="Equipo de la clinica"
              subtitle="Tabla administrativa para buscar, filtrar, editar o activar y desactivar usuarios."
              action={
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center border border-border bg-card px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={buscar}
                      onChange={(event) => setBuscar(event.target.value)}
                      placeholder="Buscar por nombre, correo o celular"
                      className="h-10 w-[220px] border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <select
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                    className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rolFiltro}
                    onChange={(event) => setRolFiltro(event.target.value)}
                    className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="todos">Todos los roles</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <DataTable
                title="Usuarios"
                subtitle="Vista operativa del equipo actual."
                rows={tableRows}
                columns={[
                  {
                    key: 'nombre',
                    label: 'Colaborador',
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-foreground">{row.nombre}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'roles',
                    label: 'Rol',
                    render: (row) => <RoleBadges user={row.raw} />,
                  },
                  {
                    key: 'telefono',
                    label: 'Contacto',
                    render: (row) => (
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{row.telefono}</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'ultimoAcceso',
                    label: 'Ultimo acceso',
                    render: (row) => (
                      <span className="text-sm text-muted-foreground">{formatLastAccess(row.ultimoAcceso)}</span>
                    ),
                  },
                  {
                    key: 'activo',
                    label: 'Estado',
                    render: (row) => (
                      <StatusPill
                        tone={
                          row.activo
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-border bg-muted text-muted-foreground'
                        }
                      >
                        {row.activo ? 'Activo' : 'Inactivo'}
                      </StatusPill>
                    ),
                  },
                  {
                    key: 'acciones',
                    label: 'Acciones',
                    render: (row) => (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserId(row.raw.id)
                            setEditForm(buildEditForm(row.raw))
                            setActiveSection('editar')
                          }}
                          className="text-sm font-semibold text-primary hover:text-primary"
                        >
                          Editar
                        </button>
                        {row.raw.id === usuario?.id ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Sesion actual
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleUsuarioMutation.mutate({ id: row.raw.id })}
                            disabled={toggleUsuarioMutation.isPending}
                            className="text-sm font-semibold text-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {row.raw.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No hay usuarios para este filtro"
                emptyBody="Ajusta la busqueda o registra el primer colaborador desde la pestana Crear usuario."
                action={
                  <StatusPill tone="border-border bg-muted text-foreground">
                    {formatNumber(tableRows.length)} visibles
                  </StatusPill>
                }
              />
            </DashboardPanel>

            {activeSection === 'crear' ? (
            <DashboardPanel
              title="Crear usuario"
              subtitle="Alta administrativa del colaborador con rol principal, celular laboral y contrasena inicial."
              action={<UserPlus className="h-4 w-4 text-primary" />}
            >
              <form className="grid gap-4" onSubmit={handleCreateUser}>
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, nombre: event.target.value }))
                  }
                  placeholder="Nombre completo del colaborador"
                  className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center border border-border bg-card px-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(event) =>
                        setCreateForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="correo@clinica.co"
                      className="h-11 w-full border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="flex items-center border border-border bg-card px-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={createForm.telefono}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          telefono: normalizePhone(event.target.value),
                        }))
                      }
                      placeholder="Celular laboral"
                      className="h-11 w-full border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <select
                    value={createForm.rol}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        rol: event.target.value,
                        rolesAdicionales: normalizeRoles(current.rolesAdicionales, event.target.value),
                      }))
                    }
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    value={createForm.password}
                    onFocus={() => setShowPasswordChecklist(true)}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Contrasena inicial"
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
                <PasswordChecklist
                  password={createForm.password}
                  visible={showPasswordChecklist || createForm.password.length > 0}
                />
                <div className="grid gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Roles adicionales
                  </p>
                  <RoleChecklist
                    primaryRole={createForm.rol}
                    value={createForm.rolesAdicionales}
                    onChange={(rolesAdicionales) =>
                      setCreateForm((current) => ({ ...current, rolesAdicionales }))
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={crearUsuarioMutation.isPending}
                  className="border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {crearUsuarioMutation.isPending ? 'Guardando...' : 'Guardar usuario'}
                </button>
              </form>
            </DashboardPanel>
            ) : null}
          </div>

          {activeSection === 'editar' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <DashboardPanel
              title="Resumen administrativo"
              subtitle="Lectura concreta para coordinacion, seguridad y continuidad del acceso."
            >
              <DataTable
                title="Controles clave"
                subtitle="Lo que conviene revisar antes de cambiar permisos o estados."
                rows={[
                  {
                    id: 'admins',
                    criterio: 'Administradores activos',
                    estado:
                      totalAdministrativos > 1
                        ? 'Cobertura estable'
                        : 'Cobertura sensible',
                    detalle:
                      totalAdministrativos > 1
                        ? 'La clinica tiene mas de un usuario con administracion.'
                        : 'Conviene tener al menos dos administradores para no depender de una sola cuenta.',
                  },
                  {
                    id: 'vets',
                    criterio: 'Equipo clinico',
                    estado:
                      totalVeterinarios > 0
                        ? 'Listo para agenda'
                        : 'Falta configuracion',
                    detalle:
                      totalVeterinarios > 0
                        ? 'Ya hay al menos un profesional con acceso clinico.'
                        : 'La agenda y las historias necesitan al menos un veterinario activo.',
                  },
                  {
                    id: 'capacity',
                    criterio: 'Cupo del plan',
                    estado:
                      limiteUsuarios === null || cupoDisponible > 1
                        ? 'Disponible'
                        : 'Cupo bajo',
                    detalle:
                      limiteUsuarios === null
                        ? 'La suscripcion no limita usuarios activos.'
                        : `Quedan ${formatNumber(Math.max(cupoDisponible, 0))} cupos antes de exigir gestion comercial.`,
                  },
                ]}
                columns={[
                  { key: 'criterio', label: 'Criterio' },
                  { key: 'estado', label: 'Estado' },
                  { key: 'detalle', label: 'Detalle' },
                ]}
                emptyTitle="Sin controles"
                emptyBody="No hay controles para mostrar."
              />
            </DashboardPanel>

            <DashboardPanel
              title="Editar usuario"
              subtitle={
                selectedUser
                  ? 'Ajusta datos, rol principal y roles adicionales del usuario seleccionado.'
                  : 'Selecciona primero un usuario desde la tabla para editarlo.'
              }
              action={<PencilLine className="h-4 w-4 text-primary" />}
            >
              {!selectedUser ? (
                <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
                  Esta vista se llena cuando eliges un colaborador desde la tabla principal.
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={handleUpdateUser}>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, nombre: event.target.value }))
                    }
                    placeholder="Nombre del colaborador"
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <div className="flex items-center border border-border bg-card px-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="Email del colaborador"
                      className="h-11 w-full border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={editForm.rol}
                      disabled={esUsuarioActualSeleccionado}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          rol: event.target.value,
                          rolesAdicionales: normalizeRoles(current.rolesAdicionales, event.target.value),
                        }))
                      }
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-muted"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center border border-border bg-card px-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.telefono}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            telefono: normalizePhone(event.target.value),
                          }))
                        }
                        placeholder="Celular laboral"
                        className="h-11 w-full border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Roles adicionales
                    </p>
                    <RoleChecklist
                      primaryRole={editForm.rol}
                      value={editForm.rolesAdicionales}
                      disabled={esUsuarioActualSeleccionado}
                      onChange={(rolesAdicionales) =>
                        setEditForm((current) => ({ ...current, rolesAdicionales }))
                      }
                    />
                  </div>

                  {esUsuarioActualSeleccionado ? (
                    <div className="border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-7 text-amber-800">
                      Tu sesion actual puede actualizar nombre, correo y celular, pero los permisos se cambian desde otra cuenta administrativa para evitar inconsistencias.
                    </div>
                  ) : null}

                  <div className="border border-border bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                    <p className="font-semibold text-foreground">{selectedUser.nombre}</p>
                    <p className="mt-1">Ultimo acceso: {formatLastAccess(selectedUser.ultimoAcceso)}</p>
                    <p className="mt-1">
                      Estado actual: {selectedUser.activo ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={editarUsuarioMutation.isPending}
                      className="border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {editarUsuarioMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(null)
                        setEditForm(DEFAULT_EDIT_FORM)
                      }}
                      className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                      Limpiar seleccion
                    </button>
                  </div>
                </form>
              )}
            </DashboardPanel>
          </div>
          ) : null}
        </div>
      )}
    </AdminShell>
  )
}
