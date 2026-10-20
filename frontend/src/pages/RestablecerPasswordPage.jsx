import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useResetPassword } from '@/features/auth/useAuth'

const esquema = z.object({
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/,
      'Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial'
    ),
})

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 pr-12 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const enlaceClass =
  'rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function RestablecerPasswordPage() {
  const [token] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    return hashParams.get('token') || null
  })
  const [verPassword, setVerPassword] = useState(false)
  const { mutate: restablecer, isPending, isSuccess, isError, error } = useResetPassword()

  useEffect(() => {
    if (token) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { password: '' },
    mode: 'onBlur',
  })

  const passwordField = register('password')

  const onSubmit = (data) => restablecer({ token, password: data.password })

  const tokenInvalido = isError && error?.response?.status === 401

  if (!token) {
    return <Navigate to="/login" replace />
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
            Crea tu nueva contraseña
          </h1>

          {isSuccess ? (
            <div className="mt-5 space-y-5">
              <p className="rounded-lg bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-success">
                Tu contraseña fue actualizada. Ya puedes iniciar sesión con ella.
              </p>
              <Button asChild className="h-12 w-full text-base">
                <Link to="/login">Ir a iniciar sesión</Link>
              </Button>
            </div>
          ) : tokenInvalido ? (
            <p className="mt-5 rounded-lg bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
              El enlace no es válido o ya expiró.{' '}
              <Link to="/recuperar-password" className="rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Solicita uno nuevo
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-5" noValidate>
              <p className="text-[15px] text-muted-foreground">
                Elige una contraseña que no uses en otros sitios.
              </p>

              <div>
                <label htmlFor="restablecer-password" className="mb-2 block text-sm font-semibold text-foreground">
                  Contraseña nueva
                </label>
                <div className="relative">
                  <input
                    {...passwordField}
                    id="restablecer-password"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Tu nueva contraseña"
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

              {isError && !tokenInvalido ? (
                <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
                  No pudimos actualizar la contraseña. Inténtalo de nuevo.
                </p>
              ) : null}

              <Button type="submit" disabled={isPending} className="h-12 w-full text-base">
                {isPending ? 'Guardando...' : 'Guardar contraseña'}
              </Button>

              <p className="text-center text-[15px] text-muted-foreground">
                <Link to="/login" className={enlaceClass}>
                  Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
