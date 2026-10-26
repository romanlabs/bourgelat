import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useGuardarOnboarding } from '@/features/onboarding/useOnboarding'
import { Select } from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'

const TOTAL_PASOS = 5

const CELULAR_REGEX = /^3\d{9}$/
const soloDigitosCelular = (valor) => {
  const digitos = valor.replace(/\D/g, '')
  return digitos.length > 10 && digitos.startsWith('57') ? digitos.slice(2) : digitos
}

const opcionClass = (activa) =>
  `w-full rounded-xl px-4 py-4 text-left transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    activa ? 'bg-accent ring-2 ring-primary' : 'bg-card hover:bg-muted'
  }`

const inputClass =
  'h-11 w-full rounded-lg border border-input bg-card px-4 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const labelClass = 'mb-2 block text-sm font-semibold text-foreground'
const tituloClass = 'text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground'
const subtituloClass = 'mt-2 text-[15px] text-muted-foreground'

const OPCIONES_USO = [
  { valor: 'dueno', titulo: 'Soy dueño/administrador', subtitulo: 'Gestiono la clínica en general' },
  { valor: 'veterinario', titulo: 'Soy veterinario tratante', subtitulo: 'Atiendo pacientes directamente' },
  { valor: 'recepcion', titulo: 'Trabajo en recepción/administrativo', subtitulo: 'Agenda, caja y atención al público' },
]

const OPCIONES_TIPO_CLINICA = [
  { valor: 'general', label: 'Clínica general' },
  { valor: 'especializada', label: 'Especializada' },
  { valor: 'rural', label: 'Rural / equinos y ganado' },
  { valor: 'urgencias', label: 'Urgencias 24h' },
]

const OPCIONES_TAMANO_EQUIPO = ['Solo yo', '2-5', '6-15', '16-30', '+30']

const OPCIONES_MASCOTAS_MES = [
  { valor: '0-50', label: '0-50' },
  { valor: '50-150', label: '50-150' },
  { valor: '150-400', label: '150-400' },
  { valor: '+400', label: '+400' },
]

const OPCIONES_OBJETIVO = [
  { valor: 'agenda', label: 'Agenda y citas' },
  { valor: 'historias', label: 'Historias clínicas' },
  { valor: 'inventario', label: 'Inventario y farmacia' },
  { valor: 'finanzas', label: 'Facturación y finanzas' },
]

const OPCIONES_GESTION_ACTUAL = [
  { valor: 'cuadernos', label: 'Cuadernos o Excel' },
  { valor: 'otro-software', label: 'Otro software' },
  { valor: 'nada', label: 'Nada aún' },
]

export default function OnboardingWizardPage() {
  const navigate = useNavigate()
  const { mutate: guardar, isPending } = useGuardarOnboarding()
  const [paso, setPaso] = useState(1)
  const [respuestas, setRespuestas] = useState({
    usoPlanificado: '',
    cargo: '',
    whatsapp: '',
    tipoClinica: '',
    tamanoEquipo: '',
    mascotasPorMes: '',
    objetivoInicial: '',
    gestionActual: '',
  })

  // El admin es el contacto de la clínica: sin su celular no hay cómo llamarlo.
  const celularObligatorio = useAuthStore((state) => state.usuario?.rol) === 'admin'

  const actualizar = (campo, valor) => setRespuestas((prev) => ({ ...prev, [campo]: valor }))

  const celular = soloDigitosCelular(respuestas.whatsapp)
  const celularValido = CELULAR_REGEX.test(celular)
  const celularConError = celular.length >= 10 && !celularValido

  const puedeAvanzar = {
    1: Boolean(respuestas.usoPlanificado),
    2: Boolean(respuestas.cargo) && (celularValido || (!celularObligatorio && !celular)),
    3: Boolean(respuestas.tipoClinica && respuestas.tamanoEquipo && respuestas.mascotasPorMes),
    4: Boolean(respuestas.objetivoInicial),
    5: true,
  }[paso]

  const siguiente = () => {
    if (paso < TOTAL_PASOS) {
      setPaso(paso + 1)
      return
    }
    guardar(respuestas, { onSuccess: () => navigate('/dashboard', { replace: true }) })
  }

  return (
    <div className="grid min-h-[100dvh] bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="mx-auto flex w-full max-w-[560px] flex-col justify-center px-4 py-10 sm:px-8">
        <Logo className="mb-10" />
        <div className="mb-6 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Avance del registro"
            aria-valuemin={1}
            aria-valuemax={TOTAL_PASOS}
            aria-valuenow={paso}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(paso / TOTAL_PASOS) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            Paso {paso} de {TOTAL_PASOS}
          </span>
        </div>
        {paso > 1 ? (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="-ml-2 mb-4 inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </button>
        ) : null}

        {paso === 1 ? (
          <div>
            <h1 className={tituloClass}>¿Cómo planeas usar Bourgelat?</h1>
            <p className={subtituloClass}>Selecciona la opción que más se alinea a tu rol.</p>
            <div className="mt-6 space-y-2.5">
              {OPCIONES_USO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('usoPlanificado', opcion.valor)}
                  aria-pressed={respuestas.usoPlanificado === opcion.valor}
                  className={opcionClass(respuestas.usoPlanificado === opcion.valor)}
                >
                  <p className="text-[15px] font-semibold text-foreground">{opcion.titulo}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{opcion.subtitulo}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 2 ? (
          <div>
            <h1 className={tituloClass}>Vamos a conocerte mejor</h1>
            <p className={subtituloClass}>Estos datos nos ayudan a personalizar tu experiencia.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className={labelClass}>¿Cuál es tu cargo?</label>
                <input
                  type="text"
                  value={respuestas.cargo}
                  onChange={(e) => actualizar('cargo', e.target.value)}
                  placeholder="Ej.: Directora médica"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="onboarding-celular" className={labelClass}>
                  Celular (WhatsApp){celularObligatorio ? '' : ' (opcional)'}
                </label>
                <input
                  id="onboarding-celular"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={respuestas.whatsapp}
                  onChange={(e) => actualizar('whatsapp', e.target.value)}
                  placeholder="3001234567"
                  aria-invalid={celularConError ? 'true' : undefined}
                  aria-describedby="onboarding-celular-ayuda"
                  className={`${inputClass} ${celularConError ? 'border-danger' : ''}`}
                />
                <p
                  id="onboarding-celular-ayuda"
                  className={`mt-1.5 text-[13px] ${celularConError ? 'text-danger' : 'text-muted-foreground'}`}
                >
                  {celularConError
                    ? 'Debe ser un celular colombiano de 10 dígitos que empiece por 3.'
                    : 'Para avisarte de tu plan y ayudarte si algo falla. Sin +57.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div>
            <h1 className={tituloClass}>Cuéntanos sobre tu clínica</h1>
            <p className={subtituloClass}>Estos detalles nos ayudan a adaptar Bourgelat a tu negocio.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className={labelClass}>Tipo de clínica</label>
                <Select
                  variant="field"
                  aria-label="Tipo de clínica"
                  className="h-11"
                  placeholder="Selecciona una opción"
                  value={respuestas.tipoClinica}
                  onValueChange={(value) => actualizar('tipoClinica', value)}
                  options={OPCIONES_TIPO_CLINICA.map((o) => ({ value: o.valor, label: o.label }))}
                />
              </div>
              <div>
                <label className={labelClass}>¿Cuántas personas trabajan en tu clínica?</label>
                <div className="flex flex-wrap gap-2">
                  {OPCIONES_TAMANO_EQUIPO.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => actualizar('tamanoEquipo', opcion)}
                      aria-pressed={respuestas.tamanoEquipo === opcion}
                      className={`h-10 rounded-lg px-4 text-sm font-semibold tabular-nums transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        respuestas.tamanoEquipo === opcion
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-foreground hover:bg-muted'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Mascotas atendidas al mes</label>
                <Select
                  variant="field"
                  aria-label="Mascotas por mes"
                  className="h-11"
                  placeholder="Selecciona un rango"
                  value={respuestas.mascotasPorMes}
                  onValueChange={(value) => actualizar('mascotasPorMes', value)}
                  options={OPCIONES_MASCOTAS_MES.map((o) => ({ value: o.valor, label: o.label }))}
                />
              </div>
            </div>
          </div>
        ) : null}

        {paso === 4 ? (
          <div>
            <h1 className={tituloClass}>Elige tu objetivo inicial</h1>
            <p className={subtituloClass}>Selecciona lo que quieres priorizar para empezar a usar Bourgelat.</p>
            <div className="mt-6 space-y-2.5">
              {OPCIONES_OBJETIVO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('objetivoInicial', opcion.valor)}
                  aria-pressed={respuestas.objetivoInicial === opcion.valor}
                  className={opcionClass(respuestas.objetivoInicial === opcion.valor)}
                >
                  <p className="text-[15px] font-semibold text-foreground">{opcion.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 5 ? (
          <div>
            <h1 className={tituloClass}>¡Solo un dato más!</h1>
            <p className={subtituloClass}>Con esta información definimos tus primeros pasos.</p>
            <div className="mt-6">
              <label className={labelClass}>¿Cómo gestionas tu clínica hoy? (opcional)</label>
              <Select
                variant="field"
                aria-label="Gestión actual"
                className="h-11"
                placeholder="Selecciona una opción"
                value={respuestas.gestionActual}
                onValueChange={(value) => actualizar('gestionActual', value)}
                options={OPCIONES_GESTION_ACTUAL.map((o) => ({ value: o.valor, label: o.label }))}
              />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!puedeAvanzar || isPending}
          onClick={siguiente}
          className="mt-8 h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paso < TOTAL_PASOS ? 'Continuar' : isPending ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>

      <aside className="hidden flex-col justify-center gap-6 bg-sidebar p-12 text-sidebar-foreground lg:flex xl:p-[72px]">
        <p className="max-w-[440px] text-[clamp(32px,3.4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">
          Ajustamos Bourgelat a tu clínica.
        </p>
        <p className="max-w-[420px] text-lg leading-relaxed text-sidebar-foreground/85">
          Cinco preguntas cortas para dejarte listo lo que más vas a usar desde el primer día.
        </p>
      </aside>
    </div>
  )
}
