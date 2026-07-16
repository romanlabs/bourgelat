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
import { Button } from '@/components/ui/button'
import BotonesSociales, { oauthHabilitado } from './BotonesSociales'
import { useRegistro } from './useAuth'

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
  'h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary'

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crea tu cuenta</DialogTitle>
          <DialogDescription>
            Registra tu clínica y entra directo a la plataforma.
          </DialogDescription>
        </DialogHeader>

        {oauthHabilitado ? (
          <>
            <div className="mt-4">
              <BotonesSociales contexto="registro" />
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                o regístrate con tu correo
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nombre de la clínica
            </label>
            <input
              {...nombreField}
              type="text"
              autoComplete="organization"
              placeholder="Clínica Veterinaria Bourgelat"
              className={inputClass}
            />
            {errors.nombre ? <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tu nombre
            </label>
            <input
              {...nombreAdministradorField}
              type="text"
              autoComplete="name"
              placeholder="Nombre y apellido"
              className={inputClass}
            />
            {errors.nombreAdministrador ? (
              <p className="mt-1 text-sm text-red-600">{errors.nombreAdministrador.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Correo
            </label>
            <input
              {...emailField}
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="tu@email.com"
              className={inputClass}
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contraseña
            </label>
            <input
              {...passwordField}
              type="password"
              autoComplete="new-password"
              placeholder="Crea una contraseña segura"
              className={inputClass}
            />
            {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
          </div>

          {isError ? (
            <p className="text-sm text-red-600">{obtenerMensajeError(error)}</p>
          ) : null}

          <Button type="submit" disabled={isPending} className="h-11 w-full">
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
