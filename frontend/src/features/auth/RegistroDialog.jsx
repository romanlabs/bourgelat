import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { useRegistro } from './useAuth'

// Misma paleta e identidad tipografica que LoginPage.jsx: los tokens de diseño
// (primary, foreground, border) reemplazan los colores hardcoded. El modal se abre
// desde LoginPage y desde la landing, y debe leerse como la misma superficie.

const esquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre de la clinica es requerido').max(160),
  nombreAdministrador: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
  email: z.string().trim().email('Email invalido'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/,
      'Minimo 8 caracteres con mayuscula, minuscula, numero y caracter especial'
    ),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: '',
      nombreAdministrador: '',
      email: '',
      password: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const nombreField = register('nombre')
  const nombreAdministradorField = register('nombreAdministrador')
  const emailField = register('email', { setValueAs: normalizarEmail })
  const passwordField = register('password')

  const onSubmit = (data) => {
    registro(data)
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl border-border shadow-lg">
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
              className={`${inputClass} ${errors.nombre ? 'border-red-500' : ''}`}
            />
            {errors.nombre ? <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className={labelClass}>Tu nombre</label>
            <input
              {...nombreAdministradorField}
              type="text"
              autoComplete="name"
              placeholder="Nombre y apellido"
              className={`${inputClass} ${errors.nombreAdministrador ? 'border-red-500' : ''}`}
            />
            {errors.nombreAdministrador ? (
              <p className="mt-1 text-sm text-red-600">{errors.nombreAdministrador.message}</p>
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
              placeholder="tu@email.com"
              className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <input
              {...passwordField}
              type="password"
              autoComplete="new-password"
              placeholder="Crea una contraseña segura"
              className={`${inputClass} ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
          </div>

          {isError ? <p className="text-sm text-red-600">{obtenerMensajeError(error)}</p> : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-4 h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
