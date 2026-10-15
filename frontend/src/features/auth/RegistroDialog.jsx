import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import BotonesSociales, { oauthHabilitado } from './BotonesSociales'
import ConsentimientoRegistro from './ConsentimientoRegistro'
import TurnstileWidget from '@/components/auth/TurnstileWidget'
import { turnstileHabilitado } from '@/lib/turnstile'
import CodigoVerificacionPaso from './CodigoVerificacionPaso'
import { useRegistro, useSesionVerificada } from './useAuth'

// Misma paleta e identidad tipografica que LoginPage.jsx: los tokens de diseño
// (primary, foreground, border) reemplazan los colores hardcoded. El modal se abre
// desde LoginPage y desde la landing, y debe leerse como la misma superficie.

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la clínica es requerido').max(160),
  nombreAdministrador: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
  email: z.string().trim().email('Correo inválido'),
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

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary'

const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

const obtenerMensajeError = (error) =>
  error?.response?.data?.errores?.[0]?.mensaje ||
  error?.response?.data?.message ||
  'No pudimos crear la cuenta. Inténtalo de nuevo.'

export default function RegistroDialog({ open, onOpenChange }) {
  const { mutate: registro, isPending, error, isError } = useRegistro()
  const sesionVerificada = useSesionVerificada('registro')
  const [emailPendiente, setEmailPendiente] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [reinicio, setReinicio] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: '',
      nombreAdministrador: '',
      email: '',
      password: '',
      aceptaTerminos: false,
      aceptaComunicaciones: false,
    },
    mode: 'onBlur',
  })
  const aceptaTerminos = useWatch({ control, name: 'aceptaTerminos' })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const nombreField = register('nombre')
  const nombreAdministradorField = register('nombreAdministrador')
  const emailField = register('email', { setValueAs: normalizarEmail })
  const passwordField = register('password')

  const onSubmit = (data) => {
    registro(
      { ...data, turnstileToken },
      {
        onSuccess: (respuesta) => {
          if (respuesta?.requiereVerificacion) setEmailPendiente(respuesta.email || data.email)
        },
        onError: () => setReinicio((n) => n + 1),
      }
    )
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) setEmailPendiente(null)
        onOpenChange(abierto)
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[380px] overflow-y-auto rounded-2xl border-border shadow-lg">
        {emailPendiente ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Revisa tu correo</DialogTitle>
              <DialogDescription>Confirma tu correo con el código que te enviamos.</DialogDescription>
            </DialogHeader>
            <CodigoVerificacionPaso
              email={emailPendiente}
              onVerificado={sesionVerificada}
              onVolver={() => {
                setEmailPendiente(null)
                setReinicio((n) => n + 1)
              }}
            />
          </>
        ) : (
        <>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Crea tu cuenta
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
            Registra tu clínica y entra directo a la plataforma.
          </DialogDescription>
        </DialogHeader>

        {oauthHabilitado ? (
          <div className="mt-4">
            <BotonesSociales contexto="registro" />
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                o regístrate con tu correo
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3.5" autoComplete="off">
          <div>
            <label className={labelClass}>Nombre de la clínica</label>
            <input
              {...nombreField}
              type="text"
              autoComplete="organization"
              placeholder="Clínica Veterinaria Bourgelat"
              className={`${inputClass} ${errors.nombre ? 'border-danger' : ''}`}
            />
            {errors.nombre ? <p className="mt-1 text-sm text-danger">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className={labelClass}>Tu nombre</label>
            <input
              {...nombreAdministradorField}
              type="text"
              autoComplete="name"
              placeholder="Nombre y apellido"
              className={`${inputClass} ${errors.nombreAdministrador ? 'border-danger' : ''}`}
            />
            {errors.nombreAdministrador ? (
              <p className="mt-1 text-sm text-danger">{errors.nombreAdministrador.message}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Correo</label>
            <input
              {...emailField}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              placeholder="tucorreo@ejemplo.com"
              className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
            />
            {errors.email ? <p className="mt-1 text-sm text-danger">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <input
              {...passwordField}
              type="password"
              autoComplete="new-password"
              placeholder="Crea una contraseña segura"
              className={`${inputClass} ${errors.password ? 'border-danger' : ''}`}
            />
            {errors.password ? <p className="mt-1 text-sm text-danger">{errors.password.message}</p> : null}
          </div>

          <ConsentimientoRegistro
            className="pt-1"
            terminosProps={register('aceptaTerminos')}
            comunicacionesProps={register('aceptaComunicaciones')}
            error={errors.aceptaTerminos?.message}
          />

          <TurnstileWidget resetKey={reinicio} onToken={setTurnstileToken} />

          <div aria-live="polite">
            {isError ? (
              <>
                <p className="text-sm text-danger">{obtenerMensajeError(error)}</p>
                {/registrad/i.test(obtenerMensajeError(error)) ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Si ya te registraste, inicia sesión con tu correo y contraseña para recibir un
                    código nuevo.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isPending || !aceptaTerminos || (turnstileHabilitado && !turnstileToken)}
            className="mt-4 h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        </>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
