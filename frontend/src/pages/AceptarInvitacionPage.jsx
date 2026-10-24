import { useEffect, useRef, useState } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import ConsentimientoRegistro from '@/features/auth/ConsentimientoRegistro'
import {
  useAceptarInvitacion,
  useConsultarInvitacion,
  useRechazarInvitacion,
} from '@/features/auth/useAuth'

const esquema = z.object({
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/,
      'Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial'
    ),
  aceptaTerminos: z
    .boolean()
    .refine((valor) => valor === true, 'Debes aceptar los términos y autorizar el tratamiento de datos'),
  aceptaComunicaciones: z.boolean(),
})

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 pr-12 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const enlaceClass =
  'rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Lee el token del fragment (#token=…): el navegador no lo envía al servidor,
// así no queda en logs ni en el Referer. Se borra de la barra al montar.
const leerFragment = () => {
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  return { token: hashParams.get('token') || null, rechazar: hashParams.get('rechazar') === '1' }
}

function Aviso({ tono = 'danger', children }) {
  const clases = tono === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
  return <p className={`mt-5 rounded-lg px-4 py-3 text-[15px] leading-relaxed ${clases}`}>{children}</p>
}

export default function AceptarInvitacionPage() {
  const navigate = useNavigate()
  const [{ token, rechazar: abrirEnRechazo }] = useState(leerFragment)
  const [modoRechazo, setModoRechazo] = useState(abrirEnRechazo)
  const [verPassword, setVerPassword] = useState(false)
  const consultado = useRef(false)

  const consulta = useConsultarInvitacion()
  const aceptar = useAceptarInvitacion()
  const rechazar = useRechazarInvitacion()
  const { mutate: consultar } = consulta

  useEffect(() => {
    if (!token) return
    window.history.replaceState(null, '', window.location.pathname)
    // StrictMode monta dos veces en desarrollo: una sola consulta basta.
    if (consultado.current) return
    consultado.current = true
    consultar({ token })
  }, [token, consultar])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { password: '', aceptaTerminos: false, aceptaComunicaciones: false },
    mode: 'onBlur',
  })
  const aceptaTerminos = useWatch({ control, name: 'aceptaTerminos' })
  const passwordField = register('password')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const invitacion = consulta.data
  const enlaceInvalido =
    consulta.error?.response?.status === 401 ||
    aceptar.error?.response?.status === 401 ||
    rechazar.error?.response?.status === 401

  const onSubmit = (data) =>
    aceptar.mutate(
      { token, ...data },
      {
        onSuccess: (respuesta) => {
          toast.success(respuesta?.message || 'Contraseña creada. Ya puedes iniciar sesión.')
          navigate('/login', { replace: true, state: { email: respuesta?.email || invitacion?.email } })
        },
      }
    )

  let contenido
  if (enlaceInvalido) {
    contenido = (
      <Aviso>
        La invitación no es válida o ya venció. Pide al administrador de tu clínica que te la reenvíe.
      </Aviso>
    )
  } else if (rechazar.isSuccess) {
    contenido = <Aviso tono="success">{rechazar.data?.message}</Aviso>
  } else if (consulta.isError) {
    contenido = <Aviso>No pudimos abrir la invitación. Recarga el enlace desde tu correo.</Aviso>
  } else if (!invitacion) {
    contenido = (
      <div className="mt-6 flex justify-center py-6" aria-label="Cargando invitación">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  } else if (modoRechazo) {
    contenido = (
      <div className="mt-5 space-y-5">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Se creó una cuenta con <span className="font-semibold text-foreground">{invitacion.email}</span> en{' '}
          <span className="font-semibold text-foreground">{invitacion.clinica || 'una clínica'}</span>. Si no
          esperabas esta invitación, recházala y borraremos esa cuenta.
        </p>
        {rechazar.isError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            No pudimos rechazar la invitación. Inténtalo de nuevo.
          </p>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          disabled={rechazar.isPending}
          onClick={() => rechazar.mutate({ token })}
          className="h-12 w-full text-base"
        >
          {rechazar.isPending ? 'Rechazando...' : 'Rechazar invitación'}
        </Button>
        <p className="text-center text-[15px] text-muted-foreground">
          <button type="button" onClick={() => setModoRechazo(false)} className={enlaceClass}>
            Sí la reconozco, quiero unirme
          </button>
        </p>
      </div>
    )
  } else {
    contenido = (
      <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-5" noValidate>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Hola {invitacion.nombre}, te invitaron a unirte a{' '}
          <span className="font-semibold text-foreground">{invitacion.clinica || 'una clínica'}</span>. Crea la
          contraseña con la que entrarás como <span className="font-semibold text-foreground">{invitacion.email}</span>.
          Nadie más la conoce, ni siquiera el administrador.
        </p>

        <div>
          <label htmlFor="invitacion-password" className="mb-2 block text-sm font-semibold text-foreground">
            Tu contraseña
          </label>
          <div className="relative">
            <input
              {...passwordField}
              id="invitacion-password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Elige una contraseña"
              aria-invalid={errors.password ? 'true' : undefined}
              className={`${inputClass} ${errors.password ? 'border-danger' : ''}`}
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {verPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-sm text-danger">{errors.password.message}</p>
          ) : (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo.
            </p>
          )}
        </div>

        <ConsentimientoRegistro
          terminosProps={register('aceptaTerminos')}
          comunicacionesProps={register('aceptaComunicaciones')}
          error={errors.aceptaTerminos?.message}
        />

        {aceptar.isError ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            No pudimos crear tu contraseña. Inténtalo de nuevo.
          </p>
        ) : null}

        <Button type="submit" disabled={aceptar.isPending || !aceptaTerminos} className="h-12 w-full text-base">
          {aceptar.isPending ? 'Guardando...' : 'Crear contraseña y unirme'}
        </Button>

        <p className="text-center text-[15px] text-muted-foreground">
          <button type="button" onClick={() => setModoRechazo(true)} className={enlaceClass}>
            No reconozco esta invitación
          </button>
        </p>
      </form>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-4 py-5 text-foreground sm:px-8 sm:py-6">
      <header>
        <Link
          to="/"
          className="inline-flex rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[440px] rounded-2xl bg-card p-6 sm:p-8">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground">
            {modoRechazo && !rechazar.isSuccess ? '¿No reconoces esta invitación?' : 'Únete a tu equipo'}
          </h1>
          {contenido}
          {enlaceInvalido || rechazar.isSuccess ? (
            <p className="mt-5 text-center text-[15px] text-muted-foreground">
              <Link to="/login" className={enlaceClass}>
                Ir al inicio de sesión
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
