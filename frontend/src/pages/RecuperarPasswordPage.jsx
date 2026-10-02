import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { z } from 'zod'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useForgotPassword } from '@/features/auth/useAuth'

// Caramelo de marca para texto (eyebrows y enlaces); sigue el tema.
const ACCENT = 'hsl(var(--brand-foreground))'

const esquema = z.object({
  email: z.string().trim().email('Correo inválido'),
})

export default function RecuperarPasswordPage() {
  const { mutate: solicitar, isPending, isSuccess } = useForgotPassword()

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

  const onSubmit = (data) => solicitar({ email: data.email })

  const inputClass =
    'h-14 w-full rounded-none border-0 border-b border-input bg-transparent px-1 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand'

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <Motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center justify-between px-5 pb-2 pt-4 sm:px-8"
      >
        <Link to="/" className="group inline-flex items-center gap-3 text-foreground no-underline">
          <span className="flex h-9 w-9 items-center justify-center bg-foreground text-background transition-colors duration-200 group-hover:bg-brand">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-none tracking-[-0.02em]">Bourgelat</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
              acceso veterinario
            </span>
          </span>
        </Link>
      </Motion.header>

      <main className="relative z-10 flex flex-1 items-center overflow-hidden pb-24 lg:pb-4">
        <div className="w-full px-5 sm:px-8 lg:pl-[15%] lg:pr-8">
          <div
            className="w-full max-w-[400px] border border-foreground/10 bg-card/95 px-8 py-8 backdrop-blur-sm"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -6px 20px rgba(43,32,24,0.05), 0 2px 4px rgba(43,32,24,0.04), 0 8px 20px rgba(43,32,24,0.08), 0 24px 56px rgba(43,32,24,0.10), 0 48px 80px rgba(43,32,24,0.05)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: ACCENT }}>
              Recuperar acceso
            </p>

            <h1
              className="mt-3 text-[1.45rem] leading-[1.15] tracking-[-0.03em] text-foreground"
              style={{ fontFamily: '"Spectral", "Spectral Fallback", Georgia, serif', fontWeight: 700 }}
            >
              ¿Olvidaste tu contraseña?
            </h1>

            {isSuccess ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-foreground/75">
                  Si el correo está registrado, te enviamos un enlace para crear una nueva
                  contraseña. Revisa tu bandeja de entrada y el spam.
                </p>
                <Link
                  to="/login"
                  className="inline-block text-sm font-semibold underline"
                  style={{ color: ACCENT }}
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
                <p className="text-sm text-foreground/70">
                  Escribe tu correo y te enviaremos un enlace para restablecerla.
                </p>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Correo corporativo
                  </label>
                  <input
                    {...emailField}
                    type="email"
                    autoComplete="email"
                    placeholder="Ejemplo@gmail.com"
                    className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
                  />
                  {errors.email ? (
                    <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="group h-14 w-full rounded-none bg-primary px-6 text-sm font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90"
                >
                  {isPending ? 'Enviando...' : 'Enviar enlace'}
                  {!isPending ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                </Button>

                <p className="text-sm text-muted-foreground">
                  ¿La recordaste?{' '}
                  <Link to="/login" className="font-semibold underline" style={{ color: ACCENT }}>
                    Inicia sesión
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
