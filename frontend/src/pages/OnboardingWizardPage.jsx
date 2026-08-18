import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/shared/Logo'
import { useGuardarOnboarding } from '@/features/onboarding/useOnboarding'
import { Select } from '@/components/ui/select'

const TOTAL_PASOS = 5

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

  const actualizar = (campo, valor) => setRespuestas((prev) => ({ ...prev, [campo]: valor }))

  const puedeAvanzar = {
    1: Boolean(respuestas.usoPlanificado),
    2: Boolean(respuestas.cargo),
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
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20">
        <Logo className="mb-8" />
        <div className="mb-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(paso / TOTAL_PASOS) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{paso}/{TOTAL_PASOS}</span>
        </div>
        {paso > 1 ? (
          <button
            type="button"
            onClick={() => setPaso(paso - 1)}
            className="mb-4 text-left text-sm font-medium text-primary hover:underline"
          >
            ← Volver
          </button>
        ) : null}

        {paso === 1 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">¿Cómo planeas usar Bourgelat?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona la opción que más se alinea a tu rol.</p>
            <div className="mt-6 space-y-3">
              {OPCIONES_USO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('usoPlanificado', opcion.valor)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    respuestas.usoPlanificado === opcion.valor
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium text-foreground">{opcion.titulo}</p>
                  <p className="text-sm text-muted-foreground">{opcion.subtitulo}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 2 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Vamos a conocerte mejor</h1>
            <p className="mt-1 text-sm text-muted-foreground">Estos datos nos ayudan a personalizar tu experiencia.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cuál es tu cargo?</label>
                <input
                  type="text"
                  value={respuestas.cargo}
                  onChange={(e) => actualizar('cargo', e.target.value)}
                  placeholder="Ej.: Directora médica"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">WhatsApp (opcional)</label>
                <input
                  type="tel"
                  value={respuestas.whatsapp}
                  onChange={(e) => actualizar('whatsapp', e.target.value)}
                  placeholder="Número de contacto"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">Formato: 3001234567 (sin +57)</p>
              </div>
            </div>
          </div>
        ) : null}

        {paso === 3 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cuéntanos sobre tu clínica</h1>
            <p className="mt-1 text-sm text-muted-foreground">Estos detalles nos ayudan a adaptar Bourgelat a tu negocio.</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo de clínica</label>
                <Select
                  variant="field"
                  aria-label="Tipo de clínica"
                  className="h-11 rounded-lg"
                  placeholder="Selecciona una opción"
                  value={respuestas.tipoClinica}
                  onValueChange={(value) => actualizar('tipoClinica', value)}
                  options={OPCIONES_TIPO_CLINICA.map((o) => ({ value: o.valor, label: o.label }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cuántas personas trabajan en tu clínica?</label>
                <div className="flex flex-wrap gap-2">
                  {OPCIONES_TAMANO_EQUIPO.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => actualizar('tamanoEquipo', opcion)}
                      className={`rounded-lg border px-4 py-2 text-sm transition ${
                        respuestas.tamanoEquipo === opcion
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Mascotas atendidas al mes</label>
                <Select
                  variant="field"
                  aria-label="Mascotas por mes"
                  className="h-11 rounded-lg"
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
            <h1 className="text-2xl font-semibold text-foreground">Elige tu objetivo inicial</h1>
            <p className="mt-1 text-sm text-muted-foreground">Selecciona lo que quieres priorizar para empezar a usar Bourgelat.</p>
            <div className="mt-6 space-y-3">
              {OPCIONES_OBJETIVO.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => actualizar('objetivoInicial', opcion.valor)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    respuestas.objetivoInicial === opcion.valor
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-medium text-foreground">{opcion.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 5 ? (
          <div>
            <h1 className="text-2xl font-semibold text-foreground">¡Solo un dato más!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Con esta información definimos tus primeros pasos.</p>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-foreground">¿Cómo gestionas tu clínica hoy? (opcional)</label>
              <Select
                variant="field"
                aria-label="Gestión actual"
                className="h-11 rounded-lg"
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
          className="mt-8 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {paso < TOTAL_PASOS ? 'Continuar' : isPending ? 'Guardando...' : 'Finalizar'}
        </button>
      </div>

      <div className="hidden bg-muted lg:block" aria-hidden="true" />
    </div>
  )
}
