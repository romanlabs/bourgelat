import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Dialog, DropdownMenu } from 'radix-ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ChevronDown, CircleAlert, MoreHorizontal, Pencil, Search, Sparkles, UserCheck, UserPlus, UserX, X } from 'lucide-react'
import FilaDeslizable from '@/components/movil/FilaDeslizable'
import HojaInferior from '@/components/movil/HojaInferior'
import TirarParaRefrescar from '@/components/movil/TirarParaRefrescar'
import { useMantenerPresionado } from '@/lib/gestos'
import { useEsCelular } from '@/lib/useEsCelular'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import { DashboardPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatNumber, toNumber } from '@/features/dashboard/dashboardUtils'

/** '1 cupo disponible' / '2 cupos disponibles' */
const textoCupos = (cantidad, singular = '', plural = '') => {
  const n = Math.max(cantidad, 0)
  const sufijo = n === 1 ? singular : plural
  return `${formatNumber(n)} ${n === 1 ? 'cupo' : 'cupos'}${sufijo ? ` ${sufijo}` : ''}`
}
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { useAuthStore } from '@/store/authStore'
import { MODULE_ACCESS, canAccessModule, hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { invalidarDominios } from '@/lib/queryKeys'
import { Select } from '@/components/ui/select'
import CampoCelular from '@/components/shared/CampoCelular'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { celularE164, esCelularValido, formatearCelular } from '@/lib/celular'

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

// Sin contraseña: la persona invitada la crea desde el enlace de su correo.
const DEFAULT_CREATE_FORM = {
  nombre: '',
  email: '',
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


const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const normalizeEmail = (value) => value.trim().toLowerCase()
// Un administrador ya tiene todos los permisos: de los roles adicionales solo
// cuenta Veterinario, porque citas e historias exigen un usuario veterinario.
const normalizeRoles = (roles, primaryRole) =>
  [...new Set((Array.isArray(roles) ? roles : []).filter((role) => role && role !== primaryRole))].filter(
    (role) => primaryRole !== 'admin' || role === 'veterinario'
  )

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const CAMPO =
  'h-12 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground lg:h-11 lg:text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

const getRoleLabel = (role) => ROLE_LABELS[role] || role || 'Sin rol'

const hasVeterinaryAccess = (user) => hasAnyRole(user, ['veterinario'])

const buildEditForm = (user) => ({
  id: user?.id || '',
  nombre: user?.nombre || '',
  email: user?.email || '',
  rol: user?.rol || 'recepcionista',
  telefono: celularE164(user?.telefono),
  rolesAdicionales: Array.isArray(user?.rolesAdicionales) ? user.rolesAdicionales : [],
  activo: Boolean(user?.activo),
})

const formatLastAccess = (value, esSesionActual = false) => {
  if (esSesionActual) return 'Sesión actual'
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

  if (primaryRole === 'admin') {
    const atiende = value.includes('veterinario')
    return (
      <label
        className={cn(
          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-ring',
          atiende ? 'bg-accent text-primary' : 'bg-muted text-foreground hover:bg-secondary'
        )}
      >
        <input
          type="checkbox"
          checked={atiende}
          disabled={disabled}
          onChange={() => onChange(atiende ? [] : ['veterinario'])}
        />
        También atiende consultas (veterinario)
      </label>
    )
  }

  return (
    <div className="grid gap-2">
      <p className="text-[13px] font-medium text-muted-foreground">Roles adicionales</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {availableRoles.map((role) => {
        const checked = value.includes(role.value)

        return (
          <label
            key={role.value}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-ring ${
              disabled
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : checked
                  ? 'cursor-pointer bg-accent text-primary'
                  : 'cursor-pointer bg-muted text-foreground hover:bg-secondary'
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
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

// Editar, reenviar invitación, activar/desactivar y eliminar en un menú «⋯».
// La propia cuenta no se desactiva ni se elimina.
function AccionesUsuario({ nombre, onEditar, onReenviar, onCambiarEstado, onEliminar, activo }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${nombre}`}
          className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground lg:h-9 lg:w-9 transition hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary', FOCO)}
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
          <DropdownMenu.Item onSelect={onEditar} className="flex cursor-pointer min-h-11 items-center rounded-lg px-3 text-sm lg:min-h-0 lg:py-2.5 text-foreground outline-none transition hover:bg-muted focus:bg-muted">
            Editar
          </DropdownMenu.Item>
          {onReenviar ? (
            <DropdownMenu.Item onSelect={onReenviar} className="flex cursor-pointer min-h-11 items-center rounded-lg px-3 text-sm lg:min-h-0 lg:py-2.5 text-foreground outline-none transition hover:bg-muted focus:bg-muted">
              Reenviar invitación
            </DropdownMenu.Item>
          ) : null}
          {onCambiarEstado ? (
            <DropdownMenu.Item
              onSelect={onCambiarEstado}
              className={cn(
                'flex cursor-pointer min-h-11 items-center rounded-lg px-3 text-sm lg:min-h-0 lg:py-2.5 outline-none transition hover:bg-muted focus:bg-muted',
                activo ? 'text-danger' : 'text-foreground'
              )}
            >
              {activo ? 'Desactivar' : 'Activar'}
            </DropdownMenu.Item>
          ) : null}
          {onEliminar ? (
            <DropdownMenu.Item
              onSelect={onEliminar}
              className="flex cursor-pointer min-h-11 items-center rounded-lg px-3 text-sm lg:min-h-0 lg:py-2.5 text-danger outline-none transition hover:bg-muted focus:bg-muted"
            >
              Eliminar
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Celular: deslizar la tarjeta deja ver Editar y Desactivar; mantenerla
// presionada abre todas las opciones. Ambas existen también en el menú «⋯».
function ItemGestos({ acciones, onMantener, children }) {
  const { props, consumido } = useMantenerPresionado(onMantener)
  return (
    <div
      {...props}
      onClickCapture={(event) => {
        // El toque largo no debe abrir además la edición.
        if (consumido()) {
          event.stopPropagation()
          event.preventDefault()
        }
      }}
    >
      <FilaDeslizable acciones={acciones}>{children}</FilaDeslizable>
    </div>
  )
}

// Opciones de una persona en una hoja inferior (toque largo en celular).
function OpcionesUsuarioHoja({ usuario, esActual, onCerrar, onEditar, onReenviar, onCambiarEstado, onEliminar }) {
  const activo = usuario?.activo !== false
  const opcion = 'flex h-12 w-full items-center rounded-xl px-3 text-left text-base font-medium transition hover:bg-muted active:bg-muted'
  const correr = (fn) => () => {
    onCerrar()
    fn()
  }
  return (
    <HojaInferior abierta={Boolean(usuario)} onCambiar={(abierta) => { if (!abierta) onCerrar() }} titulo={usuario?.nombre || 'Opciones'}>
      <div className="flex flex-col gap-1 pb-3">
        <button type="button" className={cn(opcion, 'text-foreground')} onClick={correr(onEditar)}>Editar</button>
        {activo && usuario?.invitacionPendiente ? (
          <button type="button" className={cn(opcion, 'text-foreground')} onClick={correr(onReenviar)}>Reenviar invitación</button>
        ) : null}
        {esActual ? null : (
          <>
            <button type="button" className={cn(opcion, activo ? 'text-danger' : 'text-foreground')} onClick={correr(onCambiarEstado)}>
              {activo ? 'Desactivar' : 'Activar'}
            </button>
            <button type="button" className={cn(opcion, 'text-danger')} onClick={correr(onEliminar)}>Eliminar</button>
          </>
        )}
      </div>
    </HojaInferior>
  )
}

// Panel lateral para crear o editar sin perder de vista la lista.
function PanelLateral({ abierto, titulo, subtitulo, onCerrar, children }) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(siguiente) => { if (!siguiente) onCerrar() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-background shadow-2xl outline-none sm:w-[520px]">
          <div className="flex items-start justify-between gap-4 bg-card px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <Dialog.Title className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{titulo}</Dialog.Title>
              {subtitulo ? <Dialog.Description className="mt-1 text-sm text-muted-foreground">{subtitulo}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95', FOCO)}
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Qué abre cada rol, leído de los mismos permisos que usa el menú. El
// administrador entra a todo, así que no lleva columna.
const MODULOS_MATRIZ = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'historias', label: 'Historias clínicas' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'caja', label: 'Caja' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'usuarios', label: 'Usuarios y Clínica' },
  { key: 'auditoria', label: 'Auditoría' },
  { key: 'soporte', label: 'Soporte' },
]
const ROLES_MATRIZ = ROLE_OPTIONS.filter((rol) => rol.value !== 'admin')

function MatrizRoles() {
  // Celular: plegada por defecto (son diez módulos que empujan el contenido).
  const esCelular = useEsCelular()
  const [abierta, setAbierta] = useState(false)
  const plegada = esCelular && !abierta
  return (
    <section aria-labelledby="matriz-roles" className="rounded-2xl bg-card p-4 sm:p-6">
      <h2 id="matriz-roles" className="text-lg font-semibold tracking-[-0.02em] text-foreground">
        {esCelular ? (
          <button
            type="button"
            aria-expanded={abierta}
            onClick={() => setAbierta((v) => !v)}
            className={cn('-my-2 flex min-h-11 w-full items-center justify-between gap-3 text-left', FOCO)}
          >
            Qué puede abrir cada rol
            <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', abierta && 'rotate-180')} aria-hidden="true" />
          </button>
        ) : (
          'Qué puede abrir cada rol'
        )}
      </h2>
      {plegada ? null : (
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          El administrador entra a todo. Una persona puede tener más de un rol y suma lo que abre cada uno.
        </p>
      )}
      <ul className={cn('mt-4 flex-col sm:hidden', plegada ? 'hidden' : 'flex')}>
        {MODULOS_MATRIZ.map((modulo) => {
          const roles = ROLES_MATRIZ.filter((rol) => (MODULE_ACCESS[modulo.key] || []).includes(rol.value))
          return (
            <li key={modulo.key} className="flex flex-col gap-1.5 border-t border-border py-3">
              <span className="text-sm font-medium text-foreground">{modulo.label}</span>
              {roles.length ? (
                <span className="flex flex-wrap gap-1.5">
                  {roles.map((rol) => (
                    <span key={rol.value} className="rounded-[5px] bg-success-soft px-2 py-1 text-[13px] font-semibold text-success">
                      {rol.label}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-[13px] text-muted-foreground">Solo administración</span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[13px] text-muted-foreground">
              <th scope="col" className="pb-2.5 pr-3 font-medium">Módulo</th>
              {ROLES_MATRIZ.map((rol) => (
                <th key={rol.value} scope="col" className="px-3 pb-2.5 text-center font-medium">{rol.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULOS_MATRIZ.map((modulo) => (
              <tr key={modulo.key} className="border-t border-border">
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-foreground">{modulo.label}</th>
                {ROLES_MATRIZ.map((rol) => {
                  const puede = (MODULE_ACCESS[modulo.key] || []).includes(rol.value)
                  return (
                    <td key={rol.value} className="px-3 py-2.5 text-center">
                      {puede ? (
                        <Check className="mx-auto h-4 w-4 text-success" aria-label="Sí" />
                      ) : (
                        <span className="text-muted-foreground" aria-label="No">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// Cada rol con su color, como en el resto de la app: administración en
// petróleo, veterinario en agua, facturación en miel, recepción en lila.
const TONO_ROL = {
  admin: 'bg-primary text-primary-foreground',
  superadmin: 'bg-primary text-primary-foreground',
  veterinario: 'bg-accent text-primary',
  facturador: 'bg-warning-soft text-warning',
  recepcionista: 'bg-info-soft text-info',
  auxiliar: 'bg-success-soft text-success',
}

const inicialesDe = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('') || '?'

function RoleBadges({ user }) {
  // A un administrador solo le suma Veterinario: los demás roles ya los tiene.
  const roles = [user.rol, ...normalizeRoles(user.rolesAdicionales, user.rol)]

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role, index) => (
        <StatusPill
          key={`${user.id}-${role}-${index}`}
          tone={TONO_ROL[role] || 'bg-secondary text-secondary-foreground'}
        >
          {getRoleLabel(role)}
        </StatusPill>
      ))}
    </div>
  )
}

function RestrictedUsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Usuarios y roles"
          subtitle="Esta sección se reserva para la administración de la clínica."
        >
          <div className="rounded-xl bg-muted px-4 py-3.5 text-sm leading-6 text-muted-foreground">
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
  // Crear y editar se abren en un panel lateral: null | 'crear' | 'editar'
  const [panel, setPanel] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)
  const [opcionesDe, setOpcionesDe] = useState(null)
  const esCelular = useEsCelular()
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM)
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM)

  const busquedaDiferida = useDeferredValue(buscar.trim().toLowerCase())
  const rolPermitido = canAccessModule(usuario, 'usuarios')
  const puedeVerModulo = rolPermitido

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
      // La cuenta queda creada aunque el correo falle: se avisa para reenviar.
      if (data?.invitacionEnviada === false) toast.warning(data.message)
      else toast.success(data?.message || 'Invitación enviada')
      setCreateForm(DEFAULT_CREATE_FORM)
      setPanel(null)
      invalidarDominios(queryClient, 'equipo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible enviar la invitación.'))
    },
  })

  const reenviarInvitacionMutation = useMutation({
    mutationFn: ({ id }) => usuariosApi.reenviarInvitacion(id),
    onSuccess: (data) => {
      toast.success(data?.message || 'Invitación reenviada')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible reenviar la invitación.'))
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
              // Un correo nuevo vuelve a pedir verificación (el aviso del encabezado).
              ...(data.usuario.email !== state.usuario?.email ? { emailVerificado: false } : {}),
              nombre: data.usuario.nombre,
              email: data.usuario.email,
              telefono: data.usuario.telefono,
              rolesAdicionales: data.usuario.rolesAdicionales,
            },
          }))
        }
      }
      invalidarDominios(queryClient, 'equipo')
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
      invalidarDominios(queryClient, 'equipo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible cambiar el estado del usuario.'))
    },
  })

  const eliminarUsuarioMutation = useMutation({
    mutationFn: ({ id }) => usuariosApi.eliminarUsuario(id),
    onSuccess: (data, variables) => {
      toast.success(data?.message || 'Usuario eliminado')
      setPorEliminar(null)
      if (variables.id === selectedUserId) {
        setPanel(null)
        setSelectedUserId(null)
      }
      invalidarDominios(queryClient, 'equipo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible eliminar el usuario.'))
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
  // Quien no ha aceptado su invitación aún no puede atender.
  const totalVeterinarios = useMemo(
    () => activos.filter((item) => hasVeterinaryAccess(item) && !item.invitacionPendiente).length,
    [activos]
  )
  const limiteUsuarios = toNumber(suscripcion?.limiteUsuarios)
  const cupoDisponible =
    limiteUsuarios === null ? null : Math.max(limiteUsuarios - activos.length, 0)

  const tableRows = useMemo(
    () =>
      usuariosFiltrados.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        email: item.email,
        telefono: formatearCelular(item.telefono) || 'Sin celular laboral',
        rol: item.rol,
        rolesAdicionales: Array.isArray(item.rolesAdicionales) ? item.rolesAdicionales : [],
        activo: item.activo,
        ultimoAcceso: item.ultimoAcceso,
        raw: item,
      })),
    [usuariosFiltrados]
  )

  const esUsuarioActualSeleccionado = selectedUser?.id === usuario?.id
  // El correo de una cuenta ya activada es su llave de recuperación: solo se
  // corrige mientras la invitación está pendiente (o en la cuenta propia).
  const puedeEditarCorreo = Boolean(selectedUser?.invitacionPendiente) || esUsuarioActualSeleccionado

  const handleCreateUser = (event) => {
    event.preventDefault()

    const payload = {
      nombre: createForm.nombre.trim(),
      email: normalizeEmail(createForm.email),
      rol: createForm.rol,
      telefono: createForm.telefono,
      rolesAdicionales: normalizeRoles(createForm.rolesAdicionales, createForm.rol),
    }

    if (payload.nombre.length < 3) {
      toast.error('El nombre del colaborador debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo corporativo válido para el usuario.')
      return
    }

    if (payload.telefono && !esCelularValido(payload.telefono)) {
      toast.error('El celular laboral no es válido para el país elegido.')
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
      email: puedeEditarCorreo ? normalizeEmail(editForm.email) : selectedUser.email,
      telefono: editForm.telefono,
    }

    // Sobre la propia cuenta solo viajan los roles adicionales: el rol
    // principal lo cambia otra cuenta administrativa.
    if (!esUsuarioActualSeleccionado) payload.rol = editForm.rol
    payload.rolesAdicionales = normalizeRoles(editForm.rolesAdicionales, editForm.rol)

    if (payload.nombre.length < 3) {
      toast.error('El nombre del colaborador debe tener al menos 3 caracteres.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error('Ingresa un correo válido para actualizar el usuario.')
      return
    }

    if (payload.telefono && !esCelularValido(payload.telefono)) {
      toast.error('El celular laboral no es válido para el país elegido.')
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

  const abrirEditar = (user) => {
    setSelectedUserId(user.id)
    setEditForm(buildEditForm(user))
    setPanel('editar')
  }
  const cerrarPanel = () => setPanel(null)

  const totalEquipo = activos.length
  const titulo = usuariosQuery.isPending
    ? 'Equipo'
    : `${formatNumber(totalEquipo)} ${totalEquipo === 1 ? 'persona' : 'personas'} en el equipo`
  const descripcion =
    limiteUsuarios === null
      ? 'Tu plan no limita la cantidad de usuarios.'
      : `Tu plan incluye ${formatNumber(limiteUsuarios)} ${limiteUsuarios === 1 ? 'usuario' : 'usuarios'} · ${
          cupoDisponible === 0 ? 'no quedan cupos' : textoCupos(cupoDisponible, 'libre', 'libres')
        }`

  return (
    <AdminShell
      currentKey="usuarios"
      title={titulo}
      description={esCelular ? undefined : descripcion}
      hideSearch
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Sin cupos no hay a quién invitar; los cupos se amplían desde Mi plan. */}
          {cupoDisponible === 0 ? null : (
            <button
              type="button"
              onClick={() => {
                setCreateForm(DEFAULT_CREATE_FORM)
                setPanel('crear')
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px lg:h-10 ${FOCO}`}
            >
              <UserPlus className="h-4 w-4" />
              Invitar a alguien
            </button>
          )}
        </div>
      }
    >
      <TirarParaRefrescar onRefrescar={() => usuariosQuery.refetch()}>
      <div className="space-y-4 lg:space-y-5">
        {esCelular ? <p className="px-1 text-[13px] text-muted-foreground">{descripcion}</p> : null}
        {usuariosQuery.isError ? (
          <div className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm leading-6 text-danger">
            {getErrorMessage(usuariosQuery.error, 'No fue posible cargar el equipo de la clínica.')}
          </div>
        ) : null}

        {!usuariosQuery.isPending && totalVeterinarios === 0 ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              No hay ningún veterinario activo. La agenda y las historias clínicas necesitan al menos uno: agrégale el rol a alguien o invita al médico.
            </span>
          </div>
        ) : null}

        {/* Con pocas personas la lista entera cabe a la vista: buscar y filtrar sobra. */}
        {usuarios.length > 3 ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-12 min-w-0 flex-1 basis-full items-center sm:basis-60 gap-2.5 rounded-[10px] border border-input bg-card px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
              <Search className="h-[18px] w-[18px] shrink-0" />
              <input
                type="search"
                value={buscar}
                onChange={(event) => setBuscar(event.target.value)}
                placeholder="Buscar por nombre, correo o celular"
                aria-label="Buscar en el equipo"
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none lg:text-[15px] placeholder:text-muted-foreground"
              />
            </label>
            <div className="grid w-full grid-cols-2 gap-2 sm:contents">
            <Select aria-label="Filtrar por estado" className="h-11 w-full lg:h-10 lg:w-auto" value={estado} onValueChange={setEstado} options={STATUS_OPTIONS} />
            <Select
              aria-label="Filtrar por rol"
              className="h-11 w-full lg:h-10 lg:w-auto"
              value={rolFiltro}
              onValueChange={setRolFiltro}
              options={[{ value: 'todos', label: 'Todos los roles' }, ...ROLE_OPTIONS]}
            />
            </div>
          </div>
        ) : null}

        <section aria-label="Equipo de la clínica" className="overflow-hidden rounded-2xl bg-card">
          {usuariosQuery.isPending ? (
            <div className="flex flex-col gap-1 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold text-foreground">No hay personas para este filtro</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Ajusta la búsqueda o invita a alguien con el botón de arriba.</p>
            </div>
          ) : (
            <>
            <ul className="flex flex-col gap-2 p-2 lg:hidden">
              {tableRows.map((row) => {
                const esActual = row.raw.id === usuario?.id
                return (
                  <li key={row.id}>
                  <ItemGestos
                    acciones={[
                      { key: 'editar', label: 'Editar', icon: Pencil, tono: 'info', onClick: () => abrirEditar(row.raw) },
                      ...(esActual
                        ? []
                        : [{
                            key: 'estado',
                            label: row.activo ? 'Desactivar' : 'Activar',
                            icon: row.activo ? UserX : UserCheck,
                            tono: row.activo ? 'danger' : 'primary',
                            onClick: () => toggleUsuarioMutation.mutate({ id: row.raw.id }),
                          }]),
                    ]}
                    onMantener={() => setOpcionesDe(row.raw)}
                  >
                  <div className="flex items-start gap-1 rounded-xl bg-muted/50 p-2">
                    <button
                      type="button"
                      onClick={() => abrirEditar(row.raw)}
                      className={cn('flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg p-1.5 text-left', FOCO)}
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary"
                      >
                        {inicialesDe(row.nombre)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="block break-words font-semibold text-foreground">
                          {row.nombre}
                          {esActual ? <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">(tú)</span> : null}
                        </span>
                        <span className="block break-all text-[13px] text-muted-foreground">
                          {[row.email, row.raw.telefono].filter(Boolean).join(' · ')}
                        </span>
                        <RoleBadges user={row.raw} />
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {row.activo && row.raw.invitacionPendiente ? (
                            <StatusPill tone="whitespace-nowrap bg-warning-soft text-warning">Invitación pendiente</StatusPill>
                          ) : (
                            <StatusPill tone={cn('whitespace-nowrap', row.activo ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>
                              {row.activo ? 'Activo' : 'Inactivo'}
                            </StatusPill>
                          )}
                          <span className="text-[13px] text-muted-foreground">
                            {row.raw.invitacionPendiente ? 'Aún no ha entrado' : formatLastAccess(row.ultimoAcceso, esActual)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <AccionesUsuario
                      nombre={row.nombre}
                      onEditar={() => abrirEditar(row.raw)}
                      onReenviar={
                        row.activo && row.raw.invitacionPendiente
                          ? () => reenviarInvitacionMutation.mutate({ id: row.raw.id })
                          : null
                      }
                      onCambiarEstado={
                        esActual ? null : () => toggleUsuarioMutation.mutate({ id: row.raw.id })
                      }
                      onEliminar={esActual ? null : () => setPorEliminar(row.raw)}
                      activo={row.activo}
                    />
                  </div>
                  </ItemGestos>
                  </li>
                )
              })}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-muted-foreground">
                    <th scope="col" className="px-5 pb-3 pt-4 font-medium">Persona</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Roles</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Último acceso</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Estado</th>
                    <th scope="col" className="px-5 pb-3 pt-4"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const esActual = row.raw.id === usuario?.id
                    return (
                      <tr key={row.id} className="border-t border-border transition hover:bg-muted">
                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary"
                            >
                              {inicialesDe(row.nombre)}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold text-foreground">
                                {row.nombre}
                                {esActual ? <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">(tú)</span> : null}
                              </span>
                              <span className="block truncate text-[13px] text-muted-foreground">
                                {[row.email, row.raw.telefono].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3.5"><RoleBadges user={row.raw} /></td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-muted-foreground">
                          {row.raw.invitacionPendiente ? 'Aún no ha entrado' : formatLastAccess(row.ultimoAcceso, esActual)}
                        </td>
                        <td className="px-3 py-3.5">
                          {row.activo && row.raw.invitacionPendiente ? (
                            <StatusPill tone="whitespace-nowrap bg-warning-soft text-warning">Invitación pendiente</StatusPill>
                          ) : (
                            <StatusPill tone={cn('whitespace-nowrap', row.activo ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>
                              {row.activo ? 'Activo' : 'Inactivo'}
                            </StatusPill>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <AccionesUsuario
                            nombre={row.nombre}
                            onEditar={() => abrirEditar(row.raw)}
                            onReenviar={
                              row.activo && row.raw.invitacionPendiente
                                ? () => reenviarInvitacionMutation.mutate({ id: row.raw.id })
                                : null
                            }
                            onCambiarEstado={
                              esActual ? null : () => toggleUsuarioMutation.mutate({ id: row.raw.id })
                            }
                            onEliminar={esActual ? null : () => setPorEliminar(row.raw)}
                            activo={row.activo}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <MatrizRoles />
      </div>
      </TirarParaRefrescar>

      <OpcionesUsuarioHoja
        usuario={opcionesDe}
        esActual={opcionesDe?.id === usuario?.id}
        onCerrar={() => setOpcionesDe(null)}
        onEditar={() => abrirEditar(opcionesDe)}
        onReenviar={() => reenviarInvitacionMutation.mutate({ id: opcionesDe.id })}
        onCambiarEstado={() => toggleUsuarioMutation.mutate({ id: opcionesDe.id })}
        onEliminar={() => setPorEliminar(opcionesDe)}
      />

      <PanelLateral
        abierto={panel === 'crear'}
        titulo="Invitar a alguien"
        subtitulo="Le llegará un enlace a su correo para crear su propia contraseña. Nadie más la conocerá."
        onCerrar={cerrarPanel}
      >
        <form className="grid gap-4" onSubmit={handleCreateUser}>
          <Campo label="Nombre completo">
            <input
              type="text"
              value={createForm.nombre}
              onChange={(event) => setCreateForm((current) => ({ ...current, nombre: event.target.value }))}
              className={CAMPO}
            />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Correo">
              <input
                type="email"
                autoComplete="off"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="correo@clinica.co"
                className={CAMPO}
              />
            </Campo>
            <Campo label="Celular laboral (opcional)">
              <CampoCelular
                value={createForm.telefono}
                onChange={(valor) => setCreateForm((current) => ({ ...current, telefono: valor }))}
                aria-label="Celular laboral"
              />
            </Campo>
          </div>
          <Campo label="Rol principal">
            <Select
              variant="field"
              aria-label="Rol principal"
              className="h-12 lg:h-11"
              value={createForm.rol}
              onValueChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  rol: value,
                  rolesAdicionales: normalizeRoles(current.rolesAdicionales, value),
                }))
              }
              options={ROLE_OPTIONS}
            />
          </Campo>
          <RoleChecklist
            primaryRole={createForm.rol}
            value={createForm.rolesAdicionales}
            onChange={(rolesAdicionales) => setCreateForm((current) => ({ ...current, rolesAdicionales }))}
          />
          <p className="rounded-xl bg-muted px-4 py-3.5 text-sm leading-6 text-muted-foreground">
            El enlace vence en 72 horas. Mientras no lo abra, la persona aparece como «Invitación pendiente» y puedes reenviárselo o corregir su correo.
          </p>
          <button
            type="submit"
            disabled={crearUsuarioMutation.isPending}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px lg:h-11 disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
          >
            {crearUsuarioMutation.isPending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
      </PanelLateral>

      <PanelLateral
        abierto={panel === 'editar' && Boolean(selectedUser)}
        titulo={selectedUser ? `Editar a ${selectedUser.nombre}` : 'Editar'}
        subtitulo={
          selectedUser
            ? selectedUser.invitacionPendiente
              ? `Invitación pendiente · ${selectedUser.activo ? 'Activo' : 'Inactivo'}`
              : `Último acceso: ${formatLastAccess(selectedUser.ultimoAcceso, esUsuarioActualSeleccionado)} · ${selectedUser.activo ? 'Activo' : 'Inactivo'}`
            : ''
        }
        onCerrar={cerrarPanel}
      >
        {selectedUser ? (
          <form className="grid gap-4" onSubmit={handleUpdateUser}>
            <Campo label="Nombre completo">
              <input
                type="text"
                value={editForm.nombre}
                onChange={(event) => setEditForm((current) => ({ ...current, nombre: event.target.value }))}
                className={CAMPO}
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Correo">
                <input
                  type="email"
                  value={editForm.email}
                  disabled={!puedeEditarCorreo}
                  aria-describedby={puedeEditarCorreo ? undefined : 'correo-bloqueado'}
                  onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                  className={cn(CAMPO, 'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground')}
                />
              </Campo>
              <Campo label="Celular laboral (opcional)">
                <CampoCelular
                  value={editForm.telefono}
                  onChange={(valor) => setEditForm((current) => ({ ...current, telefono: valor }))}
                  aria-label="Celular laboral"
                />
              </Campo>
            </div>
            {puedeEditarCorreo ? (
              selectedUser.invitacionPendiente ? (
                <p className="-mt-2 text-[13px] leading-5 text-muted-foreground">
                  Si corriges el correo, la invitación anterior se anula y enviamos una nueva al correo corregido.
                </p>
              ) : null
            ) : (
              <p id="correo-bloqueado" className="-mt-2 text-[13px] leading-5 text-muted-foreground">
                El correo de una cuenta activa no se cambia desde aquí: es con el que esa persona recupera su contraseña. Si ya no lo usa, desactívala e invítala con el correo nuevo.
              </p>
            )}
            <Campo label="Rol principal">
              <Select
                variant="field"
                aria-label="Rol principal"
                className="h-11 disabled:bg-muted"
                value={editForm.rol}
                disabled={esUsuarioActualSeleccionado}
                onValueChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    rol: value,
                    rolesAdicionales: normalizeRoles(current.rolesAdicionales, value),
                  }))
                }
                options={ROLE_OPTIONS}
              />
            </Campo>
            <RoleChecklist
              primaryRole={editForm.rol}
              value={editForm.rolesAdicionales}
              onChange={(rolesAdicionales) => setEditForm((current) => ({ ...current, rolesAdicionales }))}
            />
            {esUsuarioActualSeleccionado ? (
              <p className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
                En tu propia cuenta puedes agregar roles adicionales, por ejemplo Veterinario si atiendes pacientes. El rol principal lo cambia otra cuenta administrativa.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={editarUsuarioMutation.isPending}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px lg:h-11 disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`}
            >
              {editarUsuarioMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        ) : null}
      </PanelLateral>
      <ConfirmDialog
        open={Boolean(porEliminar)}
        onOpenChange={(abierto) => { if (!abierto && !eliminarUsuarioMutation.isPending) setPorEliminar(null) }}
        title={`¿Eliminar a ${porEliminar?.nombre || 'este usuario'}?`}
        confirmLabel="Eliminar"
        loading={eliminarUsuarioMutation.isPending}
        onConfirm={() => eliminarUsuarioMutation.mutate({ id: porEliminar.id })}
      >
        {porEliminar?.invitacionPendiente ? (
          <p>Nunca aceptó la invitación, así que se borra sin dejar rastro y el enlace que recibió deja de servir.</p>
        ) : (
          <p>
            Ya no podrá entrar y deja de aparecer en el equipo. Sus historias, citas y ventas siguen a su
            nombre, marcadas como «ya no está en el equipo». Se borran su correo, celular y foto. Esto no se
            puede deshacer; si solo quieres pausar su acceso, usa «Desactivar».
          </p>
        )}
      </ConfirmDialog>
    </AdminShell>
  )
}
