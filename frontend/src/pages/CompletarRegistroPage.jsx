import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useCompletarRegistroOauth } from '@/features/auth/useAuth'
import ConsentimientoRegistro from '@/features/auth/ConsentimientoRegistro'
import CasillaAtiendePacientes from '@/features/auth/CasillaAtiendePacientes'
import CampoCelular from '@/components/shared/CampoCelular'
import { esCelularValido } from '@/lib/celular'

const esquema = z.object({
  nombreClinica: z.string().trim().min(1, 'El nombre de la clínica es requerido').max(160),
  telefono: z.string().refine(esCelularValido, 'Escribe un celular válido para el país elegido'),
  aceptaTerminos: z
    .boolean()
    .refine((valor) => valor === true, 'Debes aceptar los términos y autorizar el tratamiento de datos'),
  aceptaComunicaciones: z.boolean(),
  atiendePacientes: z.boolean(),
})

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

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
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(esquema),
    defaultValues: { nombreClinica: '', telefono: '', aceptaTerminos: false, aceptaComunicaciones: false, atiendePacientes: true },
    mode: 'onBlur',
  })
  const aceptaTerminos = useWatch({ control, name: 'aceptaTerminos' })

  const nombreClinicaField = register('nombreClinica')

  const onSubmit = (data) => {
    completarRegistro({ token, ...data })
  }

  const tokenExpirado = isError && error?.response?.status === 401

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
            ¿Cómo se llama tu clínica?
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">Un último paso y entras a la plataforma.</p>

          {tokenExpirado ? (
            <p className="mt-5 rounded-lg bg-danger-soft px-4 py-3 text-[15px] leading-relaxed text-danger">
              El enlace expiró, vuelve a intentarlo.{' '}
              <Link
                to="/login"
                className="rounded-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" autoComplete="off">
              <div>
                <label htmlFor="completar-nombre" className="mb-2 block text-sm font-semibold text-foreground">
                  Nombre de la clínica
                </label>
                <input
                  {...nombreClinicaField}
                  id="completar-nombre"
                  type="text"
                  autoComplete="organization"
                  placeholder="Veterinaria San Roque"
                  aria-invalid={errors.nombreClinica ? 'true' : undefined}
                  className={`${inputClass} ${errors.nombreClinica ? 'border-danger' : ''}`}
                />
                {errors.nombreClinica ? (
                  <p className="mt-1.5 text-sm text-danger">{errors.nombreClinica.message}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="completar-celular" className="mb-2 block text-sm font-semibold text-foreground">
                  Celular (WhatsApp)
                </label>
                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => (
                    <CampoCelular
                      id="completar-celular"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalido={Boolean(errors.telefono)}
                      className="h-12 text-base"
                    />
                  )}
                />
                {errors.telefono ? <p className="mt-1.5 text-sm text-danger">{errors.telefono.message}</p> : null}
              </div>

              <CasillaAtiendePacientes {...register('atiendePacientes')} />

              <ConsentimientoRegistro
                terminosProps={register('aceptaTerminos')}
                comunicacionesProps={register('aceptaComunicaciones')}
                error={errors.aceptaTerminos?.message}
              />

              {isError && !tokenExpirado ? (
                <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
                  No pudimos completar el registro. Inténtalo de nuevo.
                </p>
              ) : null}

              <Button type="submit" disabled={isPending || !aceptaTerminos} className="h-12 w-full text-base">
                {isPending ? 'Creando clínica...' : 'Entrar a la plataforma'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
