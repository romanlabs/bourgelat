import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Camera, Eye, EyeOff, LogOut } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { hasRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { celularE164, esCelularValido } from '@/lib/celular'
import CampoCelular from '@/components/shared/CampoCelular'
import {
  useActualizarPerfil,
  useSubirFotoPerfil,
  useCambiarPassword,
} from '@/features/perfil/usePerfil'
import { perfilApi } from '@/features/perfil/perfilApi'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
const CAMPO =
  'h-[46px] w-full rounded-lg border-0 bg-muted px-3.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary'
const BTN_SECUNDARIO = cn('inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px disabled:opacity-60', FOCO)
const BTN_PRIMARIO = cn('inline-flex h-11 items-center justify-center rounded-lg bg-primary px-[18px] text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:opacity-60', FOCO)

const ROLES = {
  admin: { label: 'Administración', clase: 'bg-primary/10 text-primary' },
  veterinario: { label: 'Veterinaria', clase: 'bg-info-soft text-info' },
  recepcionista: { label: 'Recepción', clase: 'bg-success-soft text-success' },
  auxiliar: { label: 'Auxiliar', clase: 'bg-muted text-muted-foreground' },
  facturador: { label: 'Facturación', clase: 'bg-warning-soft text-warning' },
  superadmin: { label: 'Plataforma', clase: 'bg-muted text-muted-foreground' },
}

const PROVEEDORES = { google: 'Google', microsoft: 'Microsoft' }

const passwordFuerteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const esquemaDatos = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120),
  telefono: z
    .string()
    .trim()
    .refine((v) => !v || esCelularValido(v), 'Ese número no es válido para el país elegido')
    .optional()
    .or(z.literal('')),
  cargo: z.string().trim().max(120).optional().or(z.literal('')),
  tarjetaProfesional: z.string().trim().max(60).optional().or(z.literal('')),
})

const esquemaPassword = z.object({
  passwordActual: z.string().min(1, 'Requerida'),
  passwordNueva: z
    .string()
    .regex(passwordFuerteRegex, 'Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial'),
})

const inicialesDe = (usuario) =>
  (usuario?.nombre || usuario?.email || '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase() || '?'

const mesAnio = (valor) =>
  valor ? new Date(valor).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : null

function Campo({ id, label, ayuda, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
      {children}
      {error ? <span className="text-[13px] text-danger">{error}</span> : ayuda ? <span className="text-[13px] text-muted-foreground">{ayuda}</span> : null}
    </div>
  )
}

function Encabezado({ usuario, clinica }) {
  const fileInputRef = useRef(null)
  const { mutate: actualizar } = useActualizarPerfil()
  const { mutateAsync: subirFoto, isPending: subiendoFoto } = useSubirFotoPerfil()
  const roles = [usuario?.rol, ...(usuario?.rolesAdicionales || [])].filter(Boolean)
  const desde = mesAnio(usuario?.createdAt)

  const onSeleccionarFoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const { foto } = await subirFoto(file)
    actualizar({ foto })
  }

  return (
    <header className="flex flex-wrap items-center gap-6 lg:pt-6">
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendoFoto}
          aria-label="Cambiar foto de perfil"
          className={cn('group relative h-[104px] w-[104px] overflow-hidden rounded-[30px] bg-brand text-[40px] font-bold tracking-[-0.03em] text-tinta-800', FOCO)}
        >
          {usuario?.foto ? (
            <img src={usuario.foto} alt="" className="h-full w-full bg-card object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{inicialesDe(usuario)}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="h-6 w-6" />
          </span>
        </button>
        {usuario?.foto ? (
          <button type="button" onClick={() => actualizar({ foto: null })} className="text-[13px] text-muted-foreground hover:text-danger">
            Quitar foto
          </button>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onSeleccionarFoto} />
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h1 className="break-words text-4xl font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
          {usuario?.nombre || 'Mi perfil'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {roles.map((rol) => {
            const r = ROLES[rol] || { label: rol, clase: 'bg-muted text-muted-foreground' }
            return <span key={rol} className={cn('rounded-[5px] px-2 py-1 text-[13px] font-semibold', r.clase)}>{r.label}</span>
          })}
          {desde ? (
            <span className="text-[15px] text-muted-foreground">
              En {clinica?.nombre || 'la clínica'} desde {desde}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function DatosPersonales({ usuario }) {
  const { mutate: actualizar, isPending } = useActualizarPerfil()
  const esVeterinario = hasRole(usuario, 'veterinario')
  const proveedor = PROVEEDORES[usuario?.proveedorAuth]

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(esquemaDatos),
    defaultValues: {
      nombre: usuario?.nombre || '',
      telefono: celularE164(usuario?.telefono),
      cargo: usuario?.cargo || '',
      tarjetaProfesional: usuario?.tarjetaProfesional || '',
    },
  })

  const onSubmit = (data) => {
    const payload = { nombre: data.nombre, telefono: data.telefono || null, cargo: data.cargo || null }
    if (esVeterinario) payload.tarjetaProfesional = data.tarjetaProfesional || null
    actualizar(payload, { onSuccess: () => reset(data) })
  }

  return (
    <form aria-labelledby="p-datos" onSubmit={handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-[18px] rounded-2xl bg-card p-6">
      <h2 id="p-datos" className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Datos personales</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="p-nombre" label="Nombre" error={errors.nombre?.message}>
          <input id="p-nombre" {...register('nombre')} className={CAMPO} autoComplete="name" />
        </Campo>
        <Campo id="p-telefono" label="Celular" error={errors.telefono?.message}>
          <Controller
            name="telefono"
            control={control}
            render={({ field }) => (
              <CampoCelular
                id="p-telefono"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="300 1234567"
                invalido={Boolean(errors.telefono)}
              />
            )}
          />
        </Campo>
        <Campo
          id="p-correo"
          label="Correo"
          ayuda={proveedor ? `Lo administra tu cuenta de ${proveedor}` : 'Es tu usuario para entrar'}
        >
          <input id="p-correo" value={usuario?.email || ''} readOnly className={cn(CAMPO, 'bg-secondary text-muted-foreground')} />
        </Campo>
        <Campo id="p-cargo" label="Cargo">
          <input id="p-cargo" {...register('cargo')} className={CAMPO} placeholder="Por ejemplo: médica veterinaria, cirugía" />
        </Campo>
        {esVeterinario ? (
          <Campo id="p-tarjeta" label="Tarjeta profesional" ayuda="Sale en las fórmulas que firmas">
            <input id="p-tarjeta" {...register('tarjetaProfesional')} className={CAMPO} placeholder="Número COMVEZCOL" />
          </Campo>
        ) : null}
      </div>
      <div className="flex justify-end gap-2.5">
        <button type="button" onClick={() => reset()} disabled={!isDirty || isPending} className={BTN_SECUNDARIO}>
          Descartar
        </button>
        <button type="submit" disabled={!isDirty || isPending} className={BTN_PRIMARIO}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

function CambiarPassword({ onListo }) {
  const { mutate: cambiar, isPending } = useCambiarPassword()
  const [verActual, setVerActual] = useState(false)
  const [verNueva, setVerNueva] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquemaPassword), defaultValues: { passwordActual: '', passwordNueva: '' } })

  const ojo = (visible, alternar, etiqueta) => (
    <button
      type="button"
      onClick={alternar}
      aria-label={visible ? `Ocultar ${etiqueta}` : `Mostrar ${etiqueta}`}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit((data) => cambiar(data, { onSuccess: onListo }))} className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
      <Campo id="p-pass-actual" label="Contraseña actual" error={errors.passwordActual?.message}>
        <div className="relative">
          <input id="p-pass-actual" {...register('passwordActual')} type={verActual ? 'text' : 'password'} autoComplete="current-password" className={cn(CAMPO, 'bg-card pr-10')} />
          {ojo(verActual, () => setVerActual((v) => !v), 'contraseña actual')}
        </div>
      </Campo>
      <Campo id="p-pass-nueva" label="Contraseña nueva" error={errors.passwordNueva?.message} ayuda="Al cambiarla se cierran tus sesiones en otros dispositivos">
        <div className="relative">
          <input id="p-pass-nueva" {...register('passwordNueva')} type={verNueva ? 'text' : 'password'} autoComplete="new-password" className={cn(CAMPO, 'bg-card pr-10')} />
          {ojo(verNueva, () => setVerNueva((v) => !v), 'contraseña nueva')}
        </div>
      </Campo>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onListo} className={BTN_SECUNDARIO}>Cancelar</button>
        <button type="submit" disabled={isPending} className={BTN_PRIMARIO}>{isPending ? 'Guardando…' : 'Cambiar contraseña'}</button>
      </div>
    </form>
  )
}

function Seguridad({ usuario }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [cambiando, setCambiando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const proveedor = PROVEEDORES[usuario?.proveedorAuth]

  const cerrarTodas = async () => {
    setCerrando(true)
    try {
      await perfilApi.cerrarTodasLasSesiones()
    } catch {
      // La sesión local se limpia igual aunque falle el cierre remoto.
    } finally {
      clearAuth()
      toast.info('Sesiones cerradas, vuelve a ingresar')
      navigate('/login', { replace: true })
    }
  }

  return (
    <section aria-labelledby="p-seg" className="flex flex-col gap-3.5 rounded-2xl bg-card p-6">
      <h2 id="p-seg" className="text-lg font-semibold text-foreground">Seguridad</h2>

      {proveedor ? (
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold text-foreground">Entras con {proveedor}</span>
            <span className="truncate text-[13px] text-muted-foreground">{usuario?.email}</span>
          </span>
          <span className="rounded-[5px] bg-success-soft px-2 py-1 text-[13px] font-semibold text-success">Conectado</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">Contraseña</span>
              <span className="text-[13px] text-muted-foreground">Entras con tu correo y contraseña</span>
            </span>
            {!cambiando ? (
              <button type="button" onClick={() => setCambiando(true)} className={cn(BTN_SECUNDARIO, 'h-[38px] px-3 text-[13px]')}>
                Cambiar
              </button>
            ) : null}
          </div>
          {cambiando ? <CambiarPassword onListo={() => setCambiando(false)} /> : null}
        </>
      )}

      <div className="mt-1 flex flex-col gap-2 rounded-xl bg-muted/60 p-4">
        <span className="font-semibold text-foreground">Sesiones abiertas</span>
        <span className="text-[13px] text-muted-foreground">
          Si dejaste la sesión abierta en otro equipo o crees que alguien entró con tu cuenta, ciérralas todas.
        </span>
        <button type="button" onClick={cerrarTodas} disabled={cerrando} className={cn(BTN_SECUNDARIO, 'mt-1 self-start text-danger')}>
          <LogOut className="h-4 w-4" />
          {cerrando ? 'Cerrando…' : 'Cerrar sesión en todos los dispositivos'}
        </button>
      </div>
    </section>
  )
}

// Miniaturas fijas: muestran cómo se ve cada tema sin importar el actual.
const TEMAS = [
  { valor: false, label: 'Claro', fondo: 'bg-papel-100', barra: 'bg-tinta-800', hoja: 'bg-white' },
  { valor: true, label: 'Oscuro', fondo: 'bg-tinta-900', barra: 'bg-tinta-700', hoja: 'bg-tinta-800' },
]

function Apariencia() {
  const dark = useThemeStore((s) => s.dark)
  const setDark = useThemeStore((s) => s.setDark)

  return (
    <section aria-labelledby="p-pref" className="flex flex-col gap-3.5 rounded-2xl bg-card p-6">
      <h2 id="p-pref" className="text-lg font-semibold text-foreground">Apariencia</h2>
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-2">
        {TEMAS.map((t) => {
          const activo = dark === t.valor
          return (
            <button
              key={t.label}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setDark(t.valor)}
              className={cn('flex flex-col gap-2 rounded-xl p-2.5 text-left text-foreground transition', activo ? 'bg-primary/10 ring-2 ring-inset ring-primary' : 'bg-muted hover:bg-muted/70', FOCO)}
            >
              <span className={cn('flex h-[54px] gap-1 rounded-lg p-1.5', t.fondo)} aria-hidden>
                <span className={cn('w-3.5 rounded-[3px]', t.barra)} />
                <span className={cn('flex-1 rounded-[3px]', t.hoja)} />
              </span>
              <span className={cn('text-[13px]', activo ? 'font-semibold' : 'font-medium')}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function PerfilPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const clinica = useAuthStore((s) => s.clinica)

  useEffect(() => {
    document.title = 'Mi perfil | Bourgelat'
  }, [])

  return (
    <AdminShell title="Mi perfil" hidePageHeader hideSearch>
      <div className="flex flex-col gap-6">
        <Encabezado usuario={usuario} clinica={clinica} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <DatosPersonales key={usuario?.id} usuario={usuario} />
          <div className="flex min-w-0 flex-col gap-6">
            <Seguridad usuario={usuario} />
            <Apariencia />
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
