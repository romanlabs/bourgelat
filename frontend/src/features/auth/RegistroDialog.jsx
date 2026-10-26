import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
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
import CampoCelular from '@/components/shared/CampoCelular'
import { esCelularValido } from '@/lib/celular'

// Misma composición que LoginPage.jsx (Google primero, campos altos con borde,
// un solo botón petróleo). El modal se abre desde LoginPage y desde la landing,
// y debe leerse como la misma superficie.

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la clínica es requerido').max(160),
  nombreAdministrador: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
  email: z.string().trim().email('Correo inválido'),
  telefono: z.string().refine(esCelularValido, 'Escribe un celular válido para el país elegido'),
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
  'h-11 w-full rounded-lg border border-input bg-card px-4 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const labelClass = 'mb-2 block text-sm font-semibold text-foreground'

const ayudaClass = 'mt-1.5 text-[13px] text-muted-foreground'

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
  const [showPassword, setShowPassword] = useState(false)

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
      telefono: '',
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[480px] overflow-y-auto sm:p-8">
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
        <DialogHeader className="gap-2">
          <DialogTitle className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground">
            Crea la cuenta de tu clínica
          </DialogTitle>
          <DialogDescription className="text-[15px] text-muted-foreground">
            Tú quedas como administrador.
          </DialogDescription>
        </DialogHeader>

        <p className="mt-4 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
          <span className="font-semibold">30 días con todo abierto, sin tarjeta.</span> Si te gusta, eliges
          un plan al final de la prueba.
        </p>

        {oauthHabilitado ? (
          <div className="mt-5">
            <BotonesSociales contexto="registro" />
            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-muted-foreground">o con tu correo</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" autoComplete="off">
          <div>
            <label htmlFor="registro-nombre" className={labelClass}>Nombre de la clínica</label>
            <input
              {...nombreField}
              id="registro-nombre"
              type="text"
              autoComplete="organization"
              placeholder="Veterinaria San Roque"
              className={`${inputClass} ${errors.nombre ? 'border-danger' : ''}`}
            />
            {errors.nombre ? <p className="mt-1.5 text-sm text-danger">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label htmlFor="registro-administrador" className={labelClass}>Tu nombre</label>
            <input
              {...nombreAdministradorField}
              id="registro-administrador"
              type="text"
              autoComplete="name"
              placeholder="Nombre y apellido"
              className={`${inputClass} ${errors.nombreAdministrador ? 'border-danger' : ''}`}
            />
            {errors.nombreAdministrador ? (
              <p className="mt-1.5 text-sm text-danger">{errors.nombreAdministrador.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="registro-email" className={labelClass}>Correo</label>
            <input
              {...emailField}
              id="registro-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              placeholder="tu@clinica.co"
              className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
            />
            {errors.email ? (
              <p className="mt-1.5 text-sm text-danger">{errors.email.message}</p>
            ) : (
              <p className={ayudaClass}>Te enviamos un código para confirmarlo.</p>
            )}
          </div>

          <div>
            <label htmlFor="registro-celular" className={labelClass}>Celular (WhatsApp)</label>
            <Controller
              name="telefono"
              control={control}
              render={({ field }) => (
                <CampoCelular
                  id="registro-celular"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="300 1234567"
                  invalido={Boolean(errors.telefono)}
                />
              )}
            />
            {errors.telefono ? (
              <p className="mt-1.5 text-sm text-danger">{errors.telefono.message}</p>
            ) : (
              <p className={ayudaClass}>Para avisarte de tu plan y ayudarte si algo falla.</p>
            )}
          </div>

          <div>
            <label htmlFor="registro-password" className={labelClass}>Contraseña</label>
            <div className="relative">
              <input
                {...passwordField}
                id="registro-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Crea una contraseña segura"
                className={`${inputClass} pr-12 ${errors.password ? 'border-danger' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1.5 text-sm text-danger">{errors.password.message}</p>
            ) : (
              <p className={ayudaClass}>Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo.</p>
            )}
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
            className="mt-2 h-12 w-full rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta y empezar la prueba'}
          </button>
        </form>
        </>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
