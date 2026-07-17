import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion as Motion } from 'motion/react'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResetPassword } from '@/features/auth/useAuth'

const ACCENT = '#b07645'

const esquema = z.object({
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/,
      'Mínimo 8 caracteres con mayúscula, minúscula, número y caracter especial'
    ),
})

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

  const inputClass =
    'h-14 w-full rounded-none border-0 border-b border-[#2b2018]/20 bg-transparent px-1 pr-10 text-[15px] text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 focus:border-[#b07645]'

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-[#2b2018]">
      <Motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center justify-between px-5 pb-2 pt-4 sm:px-8"
      >
        <Link to="/" className="group inline-flex items-center gap-3 text-[#2b2018] no-underline">
          <span className="flex h-9 w-9 items-center justify-center bg-[#2b2018] text-white transition-colors duration-200 group-hover:bg-[#b07645]">
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
            className="w-full max-w-[400px] border border-[#2b2018]/8 bg-white/95 px-8 py-8 backdrop-blur-sm"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -6px 20px rgba(43,32,24,0.05), 0 2px 4px rgba(43,32,24,0.04), 0 8px 20px rgba(43,32,24,0.08), 0 24px 56px rgba(43,32,24,0.10), 0 48px 80px rgba(43,32,24,0.05)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: ACCENT }}>
              Nueva contraseña
            </p>

            <h1
              className="mt-3 text-[1.45rem] leading-[1.15] tracking-[-0.03em] text-[#2b2018]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Crea tu nueva contraseña
            </h1>

            {isSuccess ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-[#2b2018]/75">
                  Tu contraseña fue actualizada. Ya puedes iniciar sesión con ella.
                </p>
                <Link
                  to="/login"
                  className="inline-block text-sm font-semibold underline"
                  style={{ color: ACCENT }}
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            ) : tokenInvalido ? (
              <p className="mt-6 text-sm text-red-600">
                El enlace no es válido o ya expiró.{' '}
                <Link to="/recuperar-password" className="font-semibold underline" style={{ color: ACCENT }}>
                  Solicita uno nuevo
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">
                    Contraseña nueva
                  </label>
                  <div className="relative">
                    <input
                      {...passwordField}
                      type={verPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Ingresa tu nueva contraseña"
                      className={`${inputClass} ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setVerPassword((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-[#2b2018]/45 transition hover:text-[#2b2018]"
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  ) : null}
                </div>

                {isError && !tokenInvalido ? (
                  <p className="text-sm text-red-600">
                    No pudimos actualizar la contraseña. Inténtalo de nuevo.
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="group h-14 w-full rounded-none bg-[#2b2018] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#3d2f24]"
                >
                  {isPending ? 'Guardando...' : 'Guardar contraseña'}
                  {!isPending ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
