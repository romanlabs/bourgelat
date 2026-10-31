import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import TurnstileWidget from '@/components/auth/TurnstileWidget'
import { turnstileHabilitado } from '@/lib/turnstile'
import { authApi } from './authApi'

const ESPERA_REENVIO = 60

const mensajeDe = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

/**
 * Paso «Revisa tu correo» compartido por registro e inicio de sesión.
 * Al confirmar el código llama a `onVerificado(data)` con usuario, clínica y suscripción.
 */
export default function CodigoVerificacionPaso({ email, onVerificado, onVolver, className = '' }) {
  const [codigo, setCodigo] = useState('')
  const [segundos, setSegundos] = useState(ESPERA_REENVIO)
  const [aviso, setAviso] = useState('')
  const [tokenReenvio, setTokenReenvio] = useState(null)
  const [reinicio, setReinicio] = useState(0)
  const inputRef = useRef(null)

  const verificar = useMutation({
    mutationFn: authApi.verificarCodigo,
    onSuccess: onVerificado,
    onError: () => {
      setCodigo('')
      inputRef.current?.focus()
    },
  })

  const reenviar = useMutation({
    mutationFn: authApi.reenviarCodigo,
    onSuccess: () => {
      setSegundos(ESPERA_REENVIO)
      setAviso('Te enviamos un código nuevo.')
    },
    onSettled: () => setReinicio((n) => n + 1),
  })

  useEffect(() => {
    if (segundos <= 0) return undefined
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [segundos])

  const enviar = (valor) => {
    if (valor.length !== 6 || verificar.isPending) return
    setAviso('')
    verificar.mutate({ email, codigo: valor })
  }

  const cambiar = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCodigo(valor)
    if (verificar.isError) verificar.reset()
    if (valor.length === 6) enviar(valor)
  }

  const puedeReenviar =
    segundos <= 0 && !reenviar.isPending && (!turnstileHabilitado || Boolean(tokenReenvio))

  return (
    <div className={className}>
      <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Revisa tu correo</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Enviamos un código de 6 dígitos a{' '}
        <span className="break-all font-medium text-foreground">{email}</span>. Escríbelo aquí
        para continuar. Si no lo ves, mira también en spam. Si sales de esta página, puedes
        volver a iniciar sesión con tu correo y contraseña para recibir un código nuevo.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          enviar(codigo)
        }}
      >
        <div>
          <label htmlFor="codigo-verificacion" className="mb-2 block text-sm font-semibold text-foreground">
            Código de verificación
          </label>
          <input
            ref={inputRef}
            id="codigo-verificacion"
            value={codigo}
            onChange={cambiar}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]*"
            placeholder="000000"
            autoFocus
            aria-describedby="codigo-verificacion-estado"
            className={`h-14 w-full rounded-lg border bg-card px-4 text-center text-[26px] font-semibold tabular-nums tracking-[0.45em] text-foreground outline-none transition placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary ${
              verificar.isError ? 'border-danger' : 'border-input'
            }`}
          />
        </div>

        <div id="codigo-verificacion-estado" aria-live="polite" className="min-h-5 text-sm">
          {verificar.isError ? (
            <p className="text-danger">
              {mensajeDe(verificar.error, 'Código incorrecto o vencido.')}
            </p>
          ) : aviso ? (
            <p className="text-success">{aviso}</p>
          ) : null}
          {reenviar.isError ? (
            <p className="text-danger">
              {mensajeDe(reenviar.error, 'No pudimos reenviar el código. Inténtalo de nuevo.')}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={codigo.length !== 6 || verificar.isPending}
          className="h-12 w-full rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {verificar.isPending ? 'Verificando...' : 'Verificar'}
        </button>
      </form>

      <div className="mt-5 space-y-3 rounded-xl bg-muted p-4">
        <TurnstileWidget resetKey={reinicio} onToken={setTokenReenvio} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            disabled={!puedeReenviar}
            onClick={() => {
              setAviso('')
              reenviar.mutate({ email, turnstileToken: tokenReenvio })
            }}
            className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:text-muted-foreground"
          >
            {reenviar.isPending ? 'Reenviando...' : 'Reenviar código'}
          </button>
          <span aria-live="polite" className="tabular-nums text-muted-foreground">
            {segundos > 0 ? `Podrás pedir otro en ${segundos} s` : null}
          </span>
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ¿Correo equivocado? Volver
        </button>
      </div>
    </div>
  )
}
