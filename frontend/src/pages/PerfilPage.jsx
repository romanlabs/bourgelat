import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Camera, ChevronRight, Eye, EyeOff, LogOut } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import HojaInferior from '@/components/movil/HojaInferior'
import { useEsCelular } from '@/lib/useEsCelular'
import { vibrar } from '@/lib/gestos'
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
  'h-12 w-full rounded-lg border-0 bg-muted px-3.5 text-base lg:h-[46px] lg:text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary'
const BTN_SECUNDARIO = cn('inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px disabled:opacity-60 lg:h-11', FOCO)
const BTN_PRIMARIO = cn('inline-flex h-12 items-center justify-center rounded-lg bg-primary px-[18px] text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:opacity-60 lg:h-11', FOCO)

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
    <header className="flex flex-wrap items-center gap-4 sm:gap-6 lg:pt-6">
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendoFoto}
          aria-label="Cambiar foto de perfil"
          className={cn('group relative h-24 w-24 overflow-hidden rounded-[28px] bg-brand text-[36px] sm:h-[104px] sm:w-[104px] sm:rounded-[30px] sm:text-[40px] font-bold tracking-[-0.03em] text-tinta-800', FOCO)}
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
          <button type="button" onClick={() => actualizar({ foto: null })} className="inline-flex min-h-11 items-center px-2 text-[13px] text-muted-foreground hover:text-danger">
            Quitar foto
          </button>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onSeleccionarFoto} />
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h1 className="break-words text-3xl font-semibold leading-none tracking-[-0.04em] text-foreground sm:text-5xl">
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
    <form aria-labelledby="p-datos" onSubmit={handleSubmit(onSubmit)} className="flex min-w-0 flex-col gap-[18px] rounded-2xl bg-card p-4 sm:p-6">
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
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end">
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

function CambiarPassword({ onListo, id, sinBotones = false }) {
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
      className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  return (
    <form id={id} onSubmit={handleSubmit((data) => cambiar(data, { onSuccess: onListo }))} className={cn('flex flex-col gap-3', !sinBotones && 'rounded-xl bg-muted/60 p-4')}>
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
      {sinBotones ? null : (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={onListo} className={BTN_SECUNDARIO}>Cancelar</button>
          <button type="submit" disabled={isPending} className={BTN_PRIMARIO}>{isPending ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </div>
      )}
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
    <section aria-labelledby="p-seg" className="flex flex-col gap-3.5 rounded-2xl bg-card p-4 sm:p-6">
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
              <button type="button" onClick={() => setCambiando(true)} className={cn(BTN_SECUNDARIO, 'h-11 px-3 text-[13px] lg:h-[38px]')}>
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
        <button type="button" onClick={cerrarTodas} disabled={cerrando} className={cn(BTN_SECUNDARIO, 'mt-1 h-auto min-h-12 w-full whitespace-normal py-2 text-center text-danger sm:w-auto sm:self-start')}>
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
    <section aria-labelledby="p-pref" className="flex flex-col gap-3.5 rounded-2xl bg-card p-4 sm:p-6">
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

// ── Celular: cabecera compacta + listas tipo ajustes; cada dato se edita en una hoja ──

function FilaAjuste({ etiqueta, valor, onClick, peligro = false, icono: Icono, sinFlecha = false }) {
  const contenido = (
    <>
      {Icono ? <Icono className={cn('h-4 w-4 shrink-0', peligro ? 'text-danger' : 'text-muted-foreground')} aria-hidden /> : null}
      <span className={cn('min-w-0 flex-1 text-left text-[15px] font-medium', peligro ? 'text-danger' : 'text-foreground')}>{etiqueta}</span>
      {valor ? <span className="max-w-[55%] truncate text-sm text-muted-foreground">{valor}</span> : null}
      {onClick && !sinFlecha ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  )
  const clase = 'flex min-h-12 w-full items-center gap-3 px-4 py-2'
  if (!onClick) return <div className={clase}>{contenido}</div>
  return (
    <button type="button" onClick={onClick} className={cn(clase, 'transition active:bg-muted', FOCO)}>
      {contenido}
    </button>
  )
}

function GrupoAjustes({ titulo, children }) {
  return (
    <section className="flex flex-col gap-1.5">
      {titulo ? <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2> : null}
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{children}</div>
    </section>
  )
}

function PerfilMovil({ usuario, clinica }) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const dark = useThemeStore((s) => s.dark)
  const setDark = useThemeStore((s) => s.setDark)
  const fileInputRef = useRef(null)
  const { mutate: actualizar, isPending } = useActualizarPerfil()
  const { mutateAsync: subirFoto, isPending: subiendoFoto } = useSubirFotoPerfil()
  const [campo, setCampo] = useState(null)
  const [verPassword, setVerPassword] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const esVeterinario = hasRole(usuario, 'veterinario')
  const proveedor = PROVEEDORES[usuario?.proveedorAuth]
  const roles = [usuario?.rol, ...(usuario?.rolesAdicionales || [])].filter(Boolean)
  const desde = mesAnio(usuario?.createdAt)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquemaDatos),
    defaultValues: {
      nombre: usuario?.nombre || '',
      telefono: celularE164(usuario?.telefono),
      cargo: usuario?.cargo || '',
      tarjetaProfesional: usuario?.tarjetaProfesional || '',
    },
  })

  const cerrarCampo = () => {
    setCampo(null)
    reset()
  }

  const onSubmit = (data) => {
    const payload = { nombre: data.nombre, telefono: data.telefono || null, cargo: data.cargo || null }
    if (esVeterinario) payload.tarjetaProfesional = data.tarjetaProfesional || null
    actualizar(payload, {
      onSuccess: () => {
        reset(data)
        setCampo(null)
      },
    })
  }

  const onSeleccionarFoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const { foto } = await subirFoto(file)
    actualizar({ foto })
  }

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

  const CAMPOS = {
    nombre: { titulo: 'Nombre' },
    telefono: { titulo: 'Celular' },
    cargo: { titulo: 'Cargo' },
    tarjetaProfesional: { titulo: 'Tarjeta profesional' },
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <header className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={subiendoFoto}
          aria-label="Cambiar foto de perfil"
          className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-tinta-800', FOCO)}
        >
          {usuario?.foto ? (
            <img src={usuario.foto} alt="" className="h-full w-full bg-card object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{inicialesDe(usuario)}</span>
          )}
          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-lg bg-foreground/70 text-background">
            <Camera className="h-3 w-3" aria-hidden />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onSeleccionarFoto} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="break-words text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{usuario?.nombre || 'Mi perfil'}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            {roles.map((rol) => {
              const r = ROLES[rol] || { label: rol, clase: 'bg-muted text-muted-foreground' }
              return <span key={rol} className={cn('rounded-[5px] px-1.5 py-0.5 text-xs font-semibold', r.clase)}>{r.label}</span>
            })}
          </div>
          {desde ? <span className="text-xs text-muted-foreground">En {clinica?.nombre || 'la clínica'} desde {desde}</span> : null}
        </div>
        {usuario?.foto ? (
          <button type="button" onClick={() => actualizar({ foto: null })} className="min-h-11 shrink-0 px-2 text-xs text-muted-foreground active:text-danger">
            Quitar foto
          </button>
        ) : null}
      </header>

      <GrupoAjustes titulo="Datos personales">
        <FilaAjuste etiqueta="Nombre" valor={usuario?.nombre} onClick={() => setCampo('nombre')} />
        <FilaAjuste etiqueta="Celular" valor={usuario?.telefono || 'Sin agregar'} onClick={() => setCampo('telefono')} />
        <FilaAjuste etiqueta="Correo" valor={usuario?.email} />
        <FilaAjuste etiqueta="Cargo" valor={usuario?.cargo || 'Sin agregar'} onClick={() => setCampo('cargo')} />
        {esVeterinario ? (
          <FilaAjuste etiqueta="Tarjeta profesional" valor={usuario?.tarjetaProfesional || 'Sin agregar'} onClick={() => setCampo('tarjetaProfesional')} />
        ) : null}
      </GrupoAjustes>
      {proveedor ? <p className="-mt-2 px-1 text-xs text-muted-foreground">El correo lo administra tu cuenta de {proveedor}.</p> : null}

      <GrupoAjustes titulo="Seguridad">
        {proveedor ? (
          <FilaAjuste etiqueta={`Entras con ${proveedor}`} valor="Conectado" />
        ) : (
          <FilaAjuste etiqueta="Contraseña" valor="Cambiar" onClick={() => setVerPassword(true)} />
        )}
        <FilaAjuste
          etiqueta={cerrando ? 'Cerrando…' : 'Cerrar sesión en todos los dispositivos'}
          icono={LogOut}
          peligro
          sinFlecha
          onClick={cerrando ? undefined : () => { vibrar(); cerrarTodas() }}
        />
      </GrupoAjustes>

      <GrupoAjustes titulo="Apariencia">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-1.5 p-2">
          {TEMAS.map((t) => {
            const activo = dark === t.valor
            return (
              <button
                key={t.label}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setDark(t.valor)}
                className={cn('flex h-12 items-center justify-center gap-2 rounded-xl text-sm transition', activo ? 'bg-primary/10 font-semibold text-primary ring-2 ring-inset ring-primary' : 'bg-muted font-medium text-foreground', FOCO)}
              >
                <span className={cn('flex h-5 w-7 gap-0.5 rounded p-0.5', t.fondo)} aria-hidden>
                  <span className={cn('w-1.5 rounded-[2px]', t.barra)} />
                  <span className={cn('flex-1 rounded-[2px]', t.hoja)} />
                </span>
                {t.label}
              </button>
            )
          })}
        </div>
      </GrupoAjustes>

      <HojaInferior
        abierta={Boolean(campo)}
        onCambiar={(a) => { if (!a) cerrarCampo() }}
        titulo={campo ? CAMPOS[campo].titulo : ''}
        pie={
          <button type="submit" form="perfil-campo" disabled={isPending} className={cn(BTN_PRIMARIO, 'w-full')}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        }
      >
        <form id="perfil-campo" onSubmit={handleSubmit(onSubmit)} className="pt-1">
          {campo === 'nombre' ? (
            <Campo id="m-nombre" label="Nombre" error={errors.nombre?.message}>
              <input id="m-nombre" {...register('nombre')} className={CAMPO} autoComplete="name" />
            </Campo>
          ) : null}
          {campo === 'telefono' ? (
            <Campo id="m-telefono" label="Celular" error={errors.telefono?.message}>
              <Controller
                name="telefono"
                control={control}
                render={({ field }) => (
                  <CampoCelular id="m-telefono" value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalido={Boolean(errors.telefono)} />
                )}
              />
            </Campo>
          ) : null}
          {campo === 'cargo' ? (
            <Campo id="m-cargo" label="Cargo" error={errors.cargo?.message}>
              <input id="m-cargo" {...register('cargo')} className={CAMPO} placeholder="Por ejemplo: médica veterinaria, cirugía" />
            </Campo>
          ) : null}
          {campo === 'tarjetaProfesional' ? (
            <Campo id="m-tarjeta" label="Tarjeta profesional" ayuda="Sale en las fórmulas que firmas" error={errors.tarjetaProfesional?.message}>
              <input id="m-tarjeta" {...register('tarjetaProfesional')} className={CAMPO} placeholder="Número COMVEZCOL" />
            </Campo>
          ) : null}
        </form>
      </HojaInferior>

      <HojaInferior
        abierta={verPassword}
        onCambiar={setVerPassword}
        titulo="Cambiar contraseña"
        pie={
          <button type="submit" form="perfil-password" className={cn(BTN_PRIMARIO, 'w-full')}>
            Cambiar contraseña
          </button>
        }
      >
        <div className="pt-1">
          <CambiarPassword id="perfil-password" sinBotones onListo={() => setVerPassword(false)} />
        </div>
      </HojaInferior>
    </div>
  )
}

export default function PerfilPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const clinica = useAuthStore((s) => s.clinica)
  const esCelular = useEsCelular()

  useEffect(() => {
    document.title = 'Mi perfil | Bourgelat'
  }, [])

  if (esCelular) {
    return (
      <AdminShell title="Mi perfil" hidePageHeader hideSearch>
        <PerfilMovil key={usuario?.id} usuario={usuario} clinica={clinica} />
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Mi perfil" hidePageHeader hideSearch>
      <div className="flex flex-col gap-4 lg:gap-6">
        <Encabezado usuario={usuario} clinica={clinica} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-6">
          <DatosPersonales key={usuario?.id} usuario={usuario} />
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            <Seguridad usuario={usuario} />
            <Apariencia />
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
