import { cn } from '@/lib/utils'
import { aFechaLocal, fechaCorta, formatoNumero, soloDia } from '@/features/pacientes/fichaSaludUtils'
import { hoyLocal } from '@/lib/fecha'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const CAMPO =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

// La escala que guarda el backend es de 1 a 5.
const CONDICION_CORPORAL = [
  { value: '1', label: 'Caquéctico' },
  { value: '2', label: 'Delgado' },
  { value: '3', label: 'Ideal' },
  { value: '4', label: 'Sobrepeso' },
  { value: '5', label: 'Obeso' },
]

const MUCOSAS = ['Rosadas', 'Pálidas', 'Ictéricas', 'Congestivas', 'Cianóticas']

const HIDRATACION = [
  { value: 'normal', label: 'Normal' },
  { value: 'deshidratacion_leve', label: 'Leve' },
  { value: 'deshidratacion_moderada', label: 'Moderada' },
  { value: 'deshidratacion_severa', label: 'Severa' },
]

function Etiqueta({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted-foreground">
      {children}
    </label>
  )
}

// Número con su unidad al lado, dentro del mismo campo.
function CampoUnidad({ id, label, unidad, value, onChange, ...props }) {
  return (
    <div className="grid gap-1.5">
      <Etiqueta htmlFor={id}>{label}</Etiqueta>
      <div className="relative">
        <input id={id} type="number" value={value} onChange={(e) => onChange(e.target.value)} className={cn(CAMPO, 'pr-12')} {...props} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">{unidad}</span>
      </div>
    </div>
  )
}

// Botones de una sola opción; tocar la elegida la quita.
function Opciones({ label, opciones, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {opciones.map((opcion) => {
        const activa = opcion.value === value
        return (
          <button
            key={opcion.value}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(activa ? '' : opcion.value)}
            className={cn(
              'h-9 rounded-lg px-3 text-[13px] transition active:translate-y-px',
              FOCO,
              activa ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted font-medium text-foreground hover:brightness-95'
            )}
          >
            {opcion.label}
          </button>
        )
      })}
    </div>
  )
}

export function SignosVitales({ form, setForm, pesoAnterior }) {
  const set = (campo) => (valor) => setForm((c) => ({ ...c, [campo]: valor }))
  const peso = Number(form.peso)
  const diferencia = pesoAnterior && peso > 0 ? peso - pesoAnterior.valor : null
  const condicion = CONDICION_CORPORAL.find((c) => c.value === String(form.condicionCorporal))
  const mucosaRapida = MUCOSAS.find((m) => m.toLowerCase() === String(form.mucosas).trim().toLowerCase())

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CampoUnidad id="hc-peso" label="Peso" unidad="kg" min="0" step="0.1" value={form.peso} onChange={set('peso')} />
        <CampoUnidad id="hc-temp" label="Temperatura" unidad="°C" min="30" max="45" step="0.1" value={form.temperatura} onChange={set('temperatura')} />
        <CampoUnidad id="hc-fc" label="Frec. cardiaca" unidad="lpm" min="0" value={form.frecuenciaCardiaca} onChange={set('frecuenciaCardiaca')} />
        <CampoUnidad id="hc-fr" label="Frec. respiratoria" unidad="rpm" min="0" value={form.frecuenciaRespiratoria} onChange={set('frecuenciaRespiratoria')} />
      </div>
      {diferencia !== null && Math.abs(diferencia) >= 0.05 ? (
        <p className={cn('-mt-1 text-[13px]', diferencia < 0 ? 'text-warning' : 'text-muted-foreground')}>
          {formatoNumero(Math.abs(diferencia), 2)} kg {diferencia < 0 ? 'menos' : 'más'} que en la consulta del {fechaCorta(pesoAnterior.fecha)}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">
          Condición corporal{condicion ? ` · ${condicion.value} de 5, ${condicion.label.toLowerCase()}` : ''}
        </span>
        <Opciones
          label="Condición corporal"
          opciones={CONDICION_CORPORAL.map((c) => ({ value: c.value, label: `${c.value} · ${c.label}` }))}
          value={String(form.condicionCorporal || '')}
          onChange={set('condicionCorporal')}
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Mucosas</span>
        <Opciones
          label="Mucosas"
          opciones={MUCOSAS.map((m) => ({ value: m, label: m }))}
          value={mucosaRapida || ''}
          onChange={set('mucosas')}
        />
        <input
          type="text"
          value={mucosaRapida ? '' : form.mucosas}
          onChange={(e) => set('mucosas')(e.target.value)}
          placeholder="Otra descripción (opcional)"
          aria-label="Otra descripción de mucosas"
          className={CAMPO}
        />
      </div>

      <div className="grid gap-1.5">
        <span className="text-[13px] font-medium text-muted-foreground">Hidratación</span>
        <Opciones label="Hidratación" opciones={HIDRATACION} value={form.estadoHidratacion} onChange={set('estadoHidratacion')} />
      </div>
    </div>
  )
}

// Estado del grupo de vacunas o desparasitaciones: lo más urgente primero.
function estadoPreventivo(items, campoProxima, nombreDe) {
  if (!items.length) return { texto: 'Sin registro', tono: 'muted' }
  const hoy = hoyLocal()
  const enUnMes = new Date()
  enUnMes.setDate(enUnMes.getDate() + 30)
  const vencidas = items.filter((i) => i[campoProxima] && soloDia(i[campoProxima]) < hoy)
  if (vencidas.length) {
    return { texto: `${vencidas.map(nombreDe).join(', ')} vencida${vencidas.length > 1 ? 's' : ''}`, tono: 'danger' }
  }
  const pronto = items.filter((i) => i[campoProxima] && aFechaLocal(i[campoProxima]) <= enUnMes)
  if (pronto.length) {
    return { texto: `${pronto.map(nombreDe).join(', ')} vence pronto`, tono: 'warning' }
  }
  return { texto: 'Al día', tono: 'success' }
}

const TONO_TEXTO = {
  danger: 'font-semibold text-danger',
  warning: 'font-semibold text-warning',
  success: 'font-semibold text-success',
  muted: 'text-muted-foreground',
  normal: 'font-medium text-foreground',
}

function FilaAntecedente({ label, valor, tono = 'normal' }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 text-right text-[13px] leading-5', TONO_TEXTO[tono])}>{valor}</dd>
    </div>
  )
}

// Resumen de antecedentes para tener a mano durante la consulta.
export function AntecedentesConsulta({ antecedentes }) {
  const alergias = (antecedentes?.alergias || []).map((a) => a.descripcion || a.tipo).filter(Boolean)
  const condiciones = (antecedentes?.condicionesCronicas || []).map((c) => c.nombre).filter(Boolean)
  const medicamentos = (antecedentes?.medicamentosActuales || [])
    .map((m) => (typeof m === 'string' ? m : m?.nombre))
    .filter(Boolean)
  const vacunas = estadoPreventivo(antecedentes?.vacunas || [], 'proximaDosis', (v) => v.nombre || 'Vacuna')
  const desparasitacion = estadoPreventivo(
    antecedentes?.desparasitaciones || [],
    'proximaFecha',
    (d) => (d.tipo ? `${String(d.tipo).charAt(0).toUpperCase()}${String(d.tipo).slice(1)}` : 'Desparasitación')
  )

  return (
    <dl className="flex flex-col divide-y divide-border">
      <FilaAntecedente
        label="Alergias"
        valor={alergias.length ? alergias.join(', ') : 'Ninguna registrada'}
        tono={alergias.length ? 'danger' : 'muted'}
      />
      {condiciones.length ? <FilaAntecedente label="Condiciones" valor={condiciones.join(', ')} tono="warning" /> : null}
      <FilaAntecedente
        label="Esterilizado"
        valor={
          antecedentes?.esterilizado
            ? `Sí${antecedentes.fechaEsterilizacion ? `, ${fechaCorta(antecedentes.fechaEsterilizacion)}` : ''}`
            : 'No'
        }
      />
      <FilaAntecedente
        label="Medicación actual"
        valor={medicamentos.length ? medicamentos.join(', ') : 'Ninguna'}
        tono={medicamentos.length ? 'normal' : 'muted'}
      />
      <FilaAntecedente label="Vacunas" valor={vacunas.texto} tono={vacunas.tono} />
      <FilaAntecedente label="Desparasitación" valor={desparasitacion.texto} tono={desparasitacion.tono} />
    </dl>
  )
}

export function ConsultaAnterior({ historia }) {
  return (
    <section aria-labelledby="hc-anterior" className="flex flex-col gap-2 rounded-2xl bg-card p-5">
      <h3 id="hc-anterior" className="text-[15px] font-semibold text-foreground">
        {historia ? `Consulta anterior · ${fechaCorta(soloDia(historia.fechaConsulta || historia.createdAt))}` : 'Consulta anterior'}
      </h3>
      {historia ? (
        <>
          <p className="text-sm leading-6 text-foreground">
            <span className="font-medium">{historia.motivoConsulta}</span>
            {historia.diagnostico ? <span className="text-muted-foreground"> · {historia.diagnostico}</span> : null}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {[historia.peso ? `${formatoNumero(historia.peso, 2)} kg` : null, historia.veterinario?.nombre].filter(Boolean).join(' · ')}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Es su primera consulta registrada.</p>
      )}
    </section>
  )
}
