import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion as Motion } from 'motion/react'
import { z } from 'zod'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompletarRegistroOauth } from '@/features/auth/useAuth'

const ACCENT = '#b07645'

const esquema = z.object({
  nombreClinica: z.string().trim().min(1, 'El nombre de la clínica es requerido').max(160),
})

export default function CompletarRegistroPage() {
  const [token] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    return hashParams.get('token') || null
  })
  const { mutate: completarRegistro, isPending, error, isError } = useCompletarRegistroOauth()

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
    defaultValues: { nombreClinica: '' },
    mode: 'onBlur',
  })

  const nombreClinicaField = register('nombreClinica')

  const onSubmit = (data) => {
    completarRegistro({ token, nombreClinica: data.nombreClinica })
  }

  const tokenExpirado = isError && error?.response?.status === 401

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const inputClass =
    'h-14 w-full rounded-none border-0 border-b border-[#2b2018]/20 bg-transparent px-1 text-[15px] text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 focus:border-[#b07645]'

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
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.26em]"
              style={{ color: ACCENT }}
            >
              Un último paso
            </p>

            <h1
              className="mt-3 text-[1.45rem] leading-[1.15] tracking-[-0.03em] text-[#2b2018]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              ¿Cómo se llama tu clínica?
            </h1>

            {tokenExpirado ? (
              <p className="mt-6 text-sm text-red-600">
                El enlace expiro, vuelve a intentarlo.{' '}
                <Link to="/login" className="font-semibold underline" style={{ color: ACCENT }}>
                  Volver al inicio de sesión
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" autoComplete="off">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">
                    Nombre de la clínica
                  </label>
                  <input
                    {...nombreClinicaField}
                    type="text"
                    autoComplete="organization"
                    placeholder="Clínica Veterinaria Bourgelat"
                    className={`${inputClass} ${errors.nombreClinica ? 'border-red-500' : ''}`}
                  />
                  {errors.nombreClinica ? (
                    <p className="mt-1 text-sm text-red-600">{errors.nombreClinica.message}</p>
                  ) : null}
                </div>

                {isError && !tokenExpirado ? (
                  <p className="text-sm text-red-600">
                    No pudimos completar el registro. Inténtalo de nuevo.
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="group h-14 w-full rounded-none bg-[#2b2018] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#3d2f24]"
                >
                  {isPending ? 'Creando clínica...' : 'Entrar a la plataforma'}
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
