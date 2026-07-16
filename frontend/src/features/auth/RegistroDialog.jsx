import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import BotonesSociales, { oauthHabilitado } from './BotonesSociales'
import { useRegistro } from './useAuth'

// Misma paleta e identidad tipografica que LoginPage.jsx (tinta/caramelo,
// Spectral, esquinas rectas): el modal de registro se abre desde ahi y desde
// la landing, y debe leerse como la misma superficie, no como un dialogo generico.
const ACCENT = '#b07645'

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
  'h-10 w-full rounded-none border-0 border-b border-[#2b2018]/20 bg-transparent px-1 text-sm text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 focus:border-[#b07645]'

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55'

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
      <DialogContent className="max-w-[380px] rounded-none border-[#2b2018]/10 bg-white p-6 shadow-[0_24px_56px_rgba(43,32,24,0.16)]">
        <DialogHeader>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: ACCENT }}
          >
            Nueva clínica
          </p>
          <DialogTitle
            className="mt-1 text-xl leading-[1.05] tracking-[-0.02em] text-[#2b2018]"
            style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
          >
            Crea tu cuenta
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] text-[#2b2018]/60">
            Registra tu clínica y entra directo a la plataforma.
          </DialogDescription>
        </DialogHeader>

        {oauthHabilitado ? (
          <div className="mt-4">
            <BotonesSociales contexto="registro" />
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#2b2018]/12" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#2b2018]/45">
                o regístrate con tu correo
              </span>
              <div className="h-px flex-1 bg-[#2b2018]/12" />
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
            className="group mt-1 flex h-11 w-full items-center justify-center rounded-none bg-[#2b2018] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#b07645] disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            {!isPending ? (
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
