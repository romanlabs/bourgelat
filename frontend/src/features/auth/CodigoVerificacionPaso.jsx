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
      <h2 className="text-xl font-semibold text-foreground">Revisa tu correo</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Enviamos un código de 6 dígitos a{' '}
        <span className="break-all font-medium text-foreground">{email}</span>. Escríbelo aquí
        para continuar. Si no lo ves, mira también en spam.
      </p>

      <form
        className="mt-5 space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          enviar(codigo)
        }}
      >
        <div>
          <label htmlFor="codigo-verificacion" className="mb-1.5 block text-sm font-medium text-foreground">
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
            className={`h-12 w-full rounded-lg border bg-background px-3 text-center font-mono text-2xl tracking-[0.5em] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary ${
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
          className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {verificar.isPending ? 'Verificando...' : 'Verificar'}
        </button>
      </form>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <TurnstileWidget resetKey={reinicio} onToken={setTokenReenvio} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button
            type="button"
            disabled={!puedeReenviar}
            onClick={() => {
              setAviso('')
              reenviar.mutate({ email, turnstileToken: tokenReenvio })
            }}
            className="font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
          >
            {reenviar.isPending ? 'Reenviando...' : 'Reenviar código'}
          </button>
          <span aria-live="polite" className="text-muted-foreground">
            {segundos > 0 ? `Podrás pedir otro en ${segundos} s` : null}
          </span>
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          ¿Correo equivocado? Volver
        </button>
      </div>
    </div>
  )
}
