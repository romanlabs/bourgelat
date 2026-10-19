import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useForgotPassword } from '@/features/auth/useAuth'
import TurnstileWidget from '@/components/auth/TurnstileWidget'
import { turnstileHabilitado } from '@/lib/turnstile'

const esquema = z.object({
  email: z.string().trim().email('Correo inválido'),
})

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const enlaceClass =
  'rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function RecuperarPasswordPage() {
  const { mutate: solicitar, isPending, isSuccess } = useForgotPassword()
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [reinicio, setReinicio] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const emailField = register('email')

  const onSubmit = (data) =>
    solicitar(
      { email: data.email, turnstileToken },
      { onError: () => setReinicio((n) => n + 1) }
    )

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
            ¿Olvidaste tu contraseña?
          </h1>

          {isSuccess ? (
            <div className="mt-5 space-y-5">
              <p className="rounded-lg bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-success">
                Si el correo está registrado, te enviamos un enlace para crear una nueva
                contraseña. Revisa tu bandeja de entrada y el spam.
              </p>
              <Link to="/login" className={`inline-block text-[15px] ${enlaceClass}`}>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-5" noValidate>
              <p className="text-[15px] text-muted-foreground">
                Escribe tu correo y te enviaremos un enlace para restablecerla.
              </p>

              <div>
                <label htmlFor="recuperar-email" className="mb-2 block text-sm font-semibold text-foreground">
                  Correo
                </label>
                <input
                  {...emailField}
                  id="recuperar-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@clinica.co"
                  aria-invalid={errors.email ? 'true' : undefined}
                  className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-sm text-danger">{errors.email.message}</p>
                ) : null}
              </div>

              <TurnstileWidget resetKey={reinicio} onToken={setTurnstileToken} />

              <Button
                type="submit"
                disabled={isPending || (turnstileHabilitado && !turnstileToken)}
                className="h-12 w-full text-base"
              >
                {isPending ? 'Enviando...' : 'Enviar enlace'}
              </Button>

              <p className="text-center text-[15px] text-muted-foreground">
                ¿La recordaste?{' '}
                <Link to="/login" className={enlaceClass}>
                  Inicia sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
