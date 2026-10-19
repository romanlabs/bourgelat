import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useVerificarEmail, useReenviarVerificacion } from '@/features/auth/useAuth'

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

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
        <div className="w-full max-w-[440px] rounded-2xl bg-card p-6 sm:p-8" aria-live="polite">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground">
            {isPending ? 'Verificando tu correo...' : isSuccess ? 'Correo verificado' : 'No pudimos verificar tu correo'}
          </h1>

          {isSuccess ? (
            <div className="mt-5 space-y-5">
              <p className="rounded-lg bg-success-soft px-4 py-3 text-[15px] leading-relaxed text-success">
                Ya confirmamos que este correo es tuyo. Puedes seguir usando Bourgelat con normalidad.
              </p>
              <Button asChild className="h-12 w-full text-base">
                <Link to="/dashboard">Ir al inicio</Link>
              </Button>
            </div>
          ) : tokenInvalido ? (
            <div className="mt-5 space-y-5">
              <p className="rounded-lg bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
                El enlace no es válido o ya expiró. Escribe tu correo para recibir uno nuevo.
              </p>

              {reenviado ? (
                <p className="rounded-lg bg-info-soft px-4 py-3 text-[15px] leading-relaxed text-info">
                  Si el correo está registrado y aún no ha sido verificado, recibirás un nuevo enlace.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="verificar-email" className="mb-2 block text-sm font-semibold text-foreground">
                      Correo
                    </label>
                    <input
                      id="verificar-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@clinica.co"
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={reenviando || !email}
                    onClick={() => reenviar({ email })}
                    className="h-12 w-full text-base"
                  >
                    {reenviando ? 'Enviando...' : 'Reenviar enlace'}
                  </Button>
                </div>
              )}
            </div>
          ) : isError ? (
            <p className="mt-5 rounded-lg bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
              Ocurrió un error al verificar tu correo. Intenta de nuevo más tarde.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}
