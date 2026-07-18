import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Camera, Eye, EyeOff, LogOut, Moon, ShieldCheck, Sun, Trash2 } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { DashboardPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
import { PLAN_META } from '@/features/dashboard/dashboardUtils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { hasRole } from '@/lib/permissions'
import {
  useActualizarPerfil,
  useSubirFotoPerfil,
  useCambiarPassword,
} from '@/features/perfil/usePerfil'
import { perfilApi } from '@/features/perfil/perfilApi'

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary'
const LABEL_CLASS = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground'

const ROLE_LABELS = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepcionista',
  auxiliar: 'Auxiliar',
  facturador: 'Facturador',
  superadmin: 'Superadmin',
}

const telefonoRegex = /^3\d{9}$/
const passwordFuerteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const esquemaIdentidad = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  telefono: z
    .string()
    .trim()
    .refine(
      (v) => !v || telefonoRegex.test(v.replace(/\D/g, '')),
      'Celular colombiano de 10 dígitos que empiece por 3'
    )
    .optional()
    .or(z.literal('')),
  cargo: z.string().trim().max(120).optional().or(z.literal('')),
  tarjetaProfesional: z.string().trim().max(60).optional().or(z.literal('')),
})

const esquemaPassword = z.object({
  passwordActual: z.string().min(1, 'Requerida'),
  passwordNueva: z
    .string()
    .regex(
      passwordFuerteRegex,
      'Mínimo 8 caracteres con mayúscula, minúscula, número y caracter especial'
    ),
})

const inicialesDe = (usuario) => {
  const base = usuario?.nombre || usuario?.email || ''
  return (
    base
      .split(' ')
      .slice(0, 2)
      .map((p) => p.charAt(0))
      .join('')
      .toUpperCase() || '?'
  )
}

const diasHasta = (fecha) => {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function CardIdentidad({ usuario }) {
  const fileInputRef = useRef(null)
  const { mutate: actualizar, isPending } = useActualizarPerfil()
  const { mutateAsync: subirFoto, isPending: subiendoFoto } = useSubirFotoPerfil()
  const esVeterinario = hasRole(usuario, 'veterinario')

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(esquemaIdentidad),
    defaultValues: {
      nombre: usuario?.nombre || '',
      telefono: usuario?.telefono || '',
      cargo: usuario?.cargo || '',
      tarjetaProfesional: usuario?.tarjetaProfesional || '',
    },
  })

  const onSubmit = (data) => {
    const payload = {
      nombre: data.nombre,
      telefono: data.telefono || null,
      cargo: data.cargo || null,
    }
    if (esVeterinario) payload.tarjetaProfesional = data.tarjetaProfesional || null
    actualizar(payload)
  }

  const onSeleccionarFoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const { foto } = await subirFoto(file)
    actualizar({ foto })
  }

  const roles = [usuario?.rol, ...(usuario?.rolesAdicionales || [])].filter(Boolean)
  const metodoAcceso =
    usuario?.proveedorAuth === 'google'
      ? 'Google'
      : usuario?.proveedorAuth === 'microsoft'
        ? 'Microsoft'
        : 'Correo y contraseña'

  return (
    <DashboardPanel title="Identidad" subtitle="Como te ve tu equipo dentro de la clínica.">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {usuario?.foto ? (
              <img
                src={usuario.foto}
                alt="Foto de perfil"
                className="h-24 w-24 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sidebar text-xl font-semibold text-[#91e7e0]">
                {inicialesDe(usuario)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={subiendoFoto}
              title="Cambiar foto"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          {usuario?.foto ? (
            <button
              type="button"
              onClick={() => actualizar({ foto: null })}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Quitar foto
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onSeleccionarFoto}
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid flex-1 gap-4 xl:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Nombre</label>
            <input {...register('nombre')} className={INPUT_CLASS} />
            {errors.nombre ? (
              <p className="mt-1 text-xs text-destructive">{errors.nombre.message}</p>
            ) : null}
          </div>
          <div>
            <label className={LABEL_CLASS}>Celular</label>
            <input {...register('telefono')} className={INPUT_CLASS} placeholder="3001234567" />
            {errors.telefono ? (
              <p className="mt-1 text-xs text-destructive">{errors.telefono.message}</p>
            ) : null}
          </div>
          <div>
            <label className={LABEL_CLASS}>Cargo</label>
            <input
              {...register('cargo')}
              className={INPUT_CLASS}
              placeholder="Ej. Médica veterinaria — cirugía"
            />
          </div>
          {esVeterinario ? (
            <div>
              <label className={LABEL_CLASS}>Tarjeta profesional</label>
              <input
                {...register('tarjetaProfesional')}
                className={INPUT_CLASS}
                placeholder="Número COMVEZCOL"
              />
            </div>
          ) : null}
          <div>
            <label className={LABEL_CLASS}>Correo</label>
            <input value={usuario?.email || ''} disabled className={`${INPUT_CLASS} opacity-60`} />
          </div>
          <div className="flex flex-wrap items-end gap-2 pb-1">
            {roles.map((rol) => (
              <StatusPill key={rol}>{ROLE_LABELS[rol] || rol}</StatusPill>
            ))}
            <StatusPill tone="border-border bg-accent text-foreground">
              Acceso: {metodoAcceso}
            </StatusPill>
          </div>
          <div className="xl:col-span-2">
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardPanel>
  )
}

function CardSeguridad({ usuario }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const { mutate: cambiar, isPending } = useCambiarPassword()
  const [verActual, setVerActual] = useState(false)
  const [verNueva, setVerNueva] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const esLocal = !usuario?.proveedorAuth || usuario.proveedorAuth === 'local'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaPassword),
    defaultValues: { passwordActual: '', passwordNueva: '' },
  })

  const onSubmit = (data) => {
    cambiar(data, { onSuccess: () => reset() })
  }

  const cerrarTodas = async () => {
    setCerrando(true)
    try {
      await perfilApi.cerrarTodasLasSesiones()
    } catch {
      // La sesion local se limpia igual aunque falle el cierre remoto
    } finally {
      clearAuth()
      toast.info('Sesiones cerradas, vuelve a ingresar')
      navigate('/login', { replace: true })
    }
  }

  return (
    <DashboardPanel title="Seguridad" subtitle="Tu acceso a la plataforma.">
      <div className="grid gap-6 xl:grid-cols-2">
        {esLocal ? (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div>
              <label className={LABEL_CLASS}>Contraseña actual</label>
              <div className="relative">
                <input
                  {...register('passwordActual')}
                  type={verActual ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`${INPUT_CLASS} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setVerActual((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {verActual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.passwordActual ? (
                <p className="mt-1 text-xs text-destructive">{errors.passwordActual.message}</p>
              ) : null}
            </div>
            <div>
              <label className={LABEL_CLASS}>Contraseña nueva</label>
              <div className="relative">
                <input
                  {...register('passwordNueva')}
                  type={verNueva ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setVerNueva((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {verNueva ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.passwordNueva ? (
                <p className="mt-1 text-xs text-destructive">{errors.passwordNueva.message}</p>
              ) : null}
            </div>
            <div>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Actualizando...' : 'Cambiar contraseña'}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Al cambiarla se cierran tus sesiones en otros dispositivos.
              </p>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Tu acceso es gestionado por{' '}
                {usuario?.proveedorAuth === 'microsoft' ? 'Microsoft' : 'Google'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No tienes contraseña en Bourgelat; la seguridad de tu cuenta (verificación en dos
                pasos, recuperación) se administra desde tu cuenta de{' '}
                {usuario?.proveedorAuth === 'microsoft' ? 'Microsoft' : 'Google'}.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-start justify-center gap-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">Sesiones</p>
          <p className="text-xs text-muted-foreground">
            Si sospechas que alguien más entró con tu cuenta, cierra todas las sesiones abiertas.
          </p>
          <Button type="button" variant="outline" onClick={cerrarTodas} disabled={cerrando}>
            <LogOut className="mr-2 h-4 w-4" />
            {cerrando ? 'Cerrando...' : 'Cerrar sesión en todos los dispositivos'}
          </Button>
        </div>
      </div>
    </DashboardPanel>
  )
}

function CardPreferencias() {
  const dark = useThemeStore((s) => s.dark)
  const toggleDark = useThemeStore((s) => s.toggleDark)

  return (
    <DashboardPanel title="Preferencias" subtitle="Cómo se ve la plataforma para ti.">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Tema de la interfaz</p>
          <p className="text-xs text-muted-foreground">
            {dark ? 'Modo oscuro activo' : 'Modo claro activo'} — solo aplica a tu sesión.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={toggleDark}>
          {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {dark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
        </Button>
      </div>
    </DashboardPanel>
  )
}

function CardSuscripcion({ suscripcion }) {
  const plan = PLAN_META[suscripcion?.plan] || PLAN_META.inicio
  const dias = diasHasta(suscripcion?.fechaFin)
  const porVencer = dias !== null && dias <= 5

  return (
    <DashboardPanel
      title="Suscripción"
      subtitle="Estado del plan de tu clínica."
      action={
        porVencer ? (
          <StatusPill tone="border-destructive/40 bg-destructive/10 text-destructive">
            Vence en {dias} {dias === 1 ? 'día' : 'días'}
          </StatusPill>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          Plan <span className="font-semibold">{plan.nombre}</span>
          {suscripcion?.fechaFin ? (
            <span className="text-muted-foreground">
              {' '}
              · vence el{' '}
              {new Date(suscripcion.fechaFin).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          ) : null}
        </p>
        <Link to="/planes" className="text-sm font-medium text-primary hover:underline">
          Ver planes y renovación
        </Link>
      </div>
    </DashboardPanel>
  )
}

export default function PerfilPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const suscripcion = useAuthStore((s) => s.suscripcion)
  const esAdmin = hasRole(usuario, 'admin')

  return (
    <AdminShell title="Mi perfil" description="Tus datos personales, tu seguridad y tu acceso.">
      <div className="grid gap-6">
        <CardIdentidad usuario={usuario} />
        <CardSeguridad usuario={usuario} />
        <CardPreferencias />
        {esAdmin && suscripcion ? <CardSuscripcion suscripcion={suscripcion} /> : null}
      </div>
    </AdminShell>
  )
}
