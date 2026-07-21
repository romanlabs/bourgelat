import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { ArrowRight, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVerificarEmail, useReenviarVerificacion } from '@/features/auth/useAuth'

const ACCENT = '#b07645'

export default function VerificarEmailPage() {
  const [token] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    return hashParams.get('token') || null
  })
  const [email, setEmail] = useState('')
  const { mutate: verificar, isPending, isSuccess, isError, error } = useVerificarEmail()
  const { mutate: reenviar, isPending: reenviando, isSuccess: reenviado } = useReenviarVerificacion()

  useEffect(() => {
    if (token) {
      window.history.replaceState(null, '', window.location.pathname)
      verificar({ token })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const tokenInvalido = isError && error?.response?.status === 401

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: ACCENT }}>
              Verificacion de correo
            </p>

            <h1
              className="mt-3 text-[1.45rem] leading-[1.15] tracking-[-0.03em] text-[#2b2018]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              {isPending ? 'Verificando tu correo...' : isSuccess ? 'Correo verificado' : 'No pudimos verificar tu correo'}
            </h1>

            {isSuccess ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-[#2b2018]/75">
                  Ya confirmamos que este correo es tuyo. Puedes seguir usando Bourgelat con normalidad.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-block text-sm font-semibold underline"
                  style={{ color: ACCENT }}
                >
                  Ir al dashboard
                </Link>
              </div>
            ) : tokenInvalido ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-red-600">
                  El enlace no es valido o ya expiro. Escribe tu correo para recibir uno nuevo.
                </p>

                {reenviado ? (
                  <p className="text-sm text-[#2b2018]/75">
                    Si el correo esta registrado y aun no ha sido verificado, recibiras un nuevo enlace.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className={inputClass}
                    />
                    <Button
                      type="button"
                      disabled={reenviando || !email}
                      onClick={() => reenviar({ email })}
                      className="group h-14 w-full rounded-none bg-[#2b2018] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#3d2f24]"
                    >
                      {reenviando ? 'Enviando...' : 'Reenviar enlace'}
                      {!reenviando ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                    </Button>
                  </div>
                )}
              </div>
            ) : isError ? (
              <p className="mt-6 text-sm text-red-600">
                Ocurrio un error al verificar tu correo. Intenta de nuevo mas tarde.
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
