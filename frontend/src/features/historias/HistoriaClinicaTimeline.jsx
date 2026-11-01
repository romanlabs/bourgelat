import { useState } from 'react'
import {
  FileText, Lock, Pencil, CalendarDays, Stethoscope, Plus, Printer, ChevronDown,
} from 'lucide-react'
import { SkeletonBlock } from '@/components/shared/SkeletonBlock'
import FilaDeslizable from '@/components/movil/FilaDeslizable'
import { useEsCelular } from '@/lib/useEsCelular'
import { cn } from '@/lib/utils'
import { tienePlanFarmacologico } from './formulaPdf'
import { normalizarMedicamentos } from './historiaPdfComun'
import { nombreAutor } from '@/lib/equipo'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const HIDRATACION = {
  normal: 'Normal',
  deshidratacion_leve: 'Deshidratación leve',
  deshidratacion_moderada: 'Deshidratación moderada',
  deshidratacion_severa: 'Deshidratación severa',
}

const CONDICION = { 1: 'Caquéctico', 2: 'Delgado', 3: 'Ideal', 4: 'Sobrepeso', 5: 'Obeso' }

const tieneValor = (v) => v !== null && v !== undefined && String(v).trim() !== ''

// Signos vitales registrados: solo los que tienen dato.
function signosDe(h) {
  return [
    tieneValor(h.peso) && ['Peso', `${Number(h.peso)} kg`],
    tieneValor(h.temperatura) && ['Temp.', `${Number(h.temperatura)} °C`],
    tieneValor(h.frecuenciaCardiaca) && ['FC', `${h.frecuenciaCardiaca} lpm`],
    tieneValor(h.frecuenciaRespiratoria) && ['FR', `${h.frecuenciaRespiratoria} rpm`],
    tieneValor(h.condicionCorporal) && ['Cond. corporal', `${h.condicionCorporal}/5${CONDICION[h.condicionCorporal] ? ` · ${CONDICION[h.condicionCorporal]}` : ''}`],
    tieneValor(h.mucosas) && ['Mucosas', h.mucosas],
    tieneValor(h.estadoHidratacion) && ['Hidratación', HIDRATACION[h.estadoHidratacion] || h.estadoHidratacion],
  ].filter(Boolean)
}

function TimelineItemSkeleton() {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-1.5 flex h-5 w-5 items-center justify-center">
        <SkeletonBlock className="h-3 w-3 rounded-full" />
      </div>
      <div className="space-y-2 rounded-2xl bg-card px-5 py-4">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3.5 w-56" />
        <SkeletonBlock className="h-3.5 w-48" />
      </div>
    </div>
  )
}

function EmptyTimeline({ onNuevaConsulta }) {
  return (
    <div className="rounded-2xl bg-card px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary"><FileText className="h-6 w-6" /></span>
      <p className="text-lg font-semibold tracking-[-0.01em] text-foreground">Sin historias clínicas</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Este paciente aún no tiene consultas registradas.
      </p>
      <button
        type="button"
        onClick={onNuevaConsulta}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar primera consulta
      </button>
    </div>
  )
}

function Dato({ titulo, children }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-muted-foreground">{titulo}</p>
      <div className="mt-0.5 whitespace-pre-line text-sm leading-6 text-foreground">{children}</div>
    </div>
  )
}

// Detalle que se despliega al tocar la tarjeta (solo celular).
function DetalleConsulta({ historia }) {
  const signos = signosDe(historia)
  const medicamentos = normalizarMedicamentos(historia.medicamentos)
  const hayAlgo = signos.length > 0 || historia.tratamiento || historia.indicaciones || medicamentos.length > 0

  if (!hayAlgo) {
    return <p className="text-[13px] text-muted-foreground">Sin más datos registrados en esta consulta.</p>
  }

  return (
    <div className="space-y-3">
      {signos.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {signos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="min-w-0 rounded-lg bg-muted px-2.5 py-1.5">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="break-words text-sm font-semibold tabular-nums text-foreground">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {historia.tratamiento && <Dato titulo="Plan / tratamiento">{historia.tratamiento}</Dato>}
      {medicamentos.length > 0 && (
        <Dato titulo="Fórmula">
          <ul className="space-y-1">
            {medicamentos.map((m, i) => (
              <li key={`${m.nombre}-${i}`}>
                <span className="font-medium">{m.nombre}</span>
                {[m.dosis, m.frecuencia, m.duracion && `por ${m.duracion}`].filter(Boolean).length > 0 && (
                  <span className="text-muted-foreground"> · {[m.dosis, m.frecuencia, m.duracion && `por ${m.duracion}`].filter(Boolean).join(' · ')}</span>
                )}
              </li>
            ))}
          </ul>
        </Dato>
      )}
      {historia.indicaciones && <Dato titulo="Indicaciones">{historia.indicaciones}</Dato>}
    </div>
  )
}

const BOTON_ACCION =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:cursor-wait disabled:opacity-60 lg:h-9'

function TimelineCard({
  historia, onEdit, onImprimirFormula, imprimiendo, onImprimirHistoria, imprimiendoHistoria,
}) {
  const esCelular = useEsCelular()
  const [abierta, setAbierta] = useState(false)
  const { bloqueada, motivoConsulta, diagnostico, fechaConsulta, createdAt, veterinario } = historia
  const conFormula = Boolean(onImprimirFormula) && tienePlanFarmacologico(historia)
  const desplegada = esCelular && abierta

  // Atajos al deslizar; todos existen también como botones al desplegar.
  const acciones = [
    conFormula && { key: 'formula', label: 'Fórmula', icon: Printer, tono: 'info', onClick: () => onImprimirFormula(historia.id) },
    { key: 'abrir', label: bloqueada ? 'Ver' : 'Editar', icon: bloqueada ? FileText : Pencil, tono: 'primary', onClick: () => onEdit(historia) },
  ].filter(Boolean)

  const contenido = (
    <div className="px-3.5 py-3 lg:px-5 lg:py-4">
      {/* Header row: en celular es el botón que despliega el detalle */}
      <div
        {...(esCelular
          ? { role: 'button', tabIndex: 0, 'aria-expanded': abierta, onClick: () => setAbierta((v) => !v),
              onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAbierta((v) => !v) } } }
          : {})}
        className={cn('flex flex-wrap items-start justify-between gap-2', esCelular && 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatDate(fechaConsulta || createdAt)}
          </span>
          {veterinario?.nombre && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate text-[13px] text-muted-foreground">{nombreAutor(veterinario)}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold lg:px-2.5 lg:py-1 lg:text-[13px] ${
              bloqueada
                ? 'bg-warning-soft text-warning'
                : 'bg-success-soft text-success'
            }`}
          >
            {bloqueada ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {bloqueada ? 'Bloqueada' : 'Editable'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 text-muted-foreground transition-transform lg:hidden', abierta && 'rotate-180')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mt-2 space-y-1 lg:mt-3 lg:space-y-1.5">
        {motivoConsulta && (
          <div className="flex items-start gap-2">
            <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className={cn('text-sm text-foreground', desplegada ? '' : 'line-clamp-1')}>
              <span className="font-medium">Motivo:</span> {motivoConsulta}
            </p>
          </div>
        )}
        {diagnostico && (
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className={cn('text-sm text-foreground', desplegada ? '' : 'line-clamp-1')}>
              <span className="font-medium">Diagnóstico:</span> {diagnostico}
            </p>
          </div>
        )}
      </div>

      {desplegada && (
        <div className="mt-3 border-t border-border pt-3">
          <DetalleConsulta historia={historia} />
        </div>
      )}

      {/* Acciones: en celular solo con la tarjeta desplegada (o al deslizar) */}
      <div className={cn('mt-2.5 flex-wrap items-center justify-end gap-x-2 gap-y-1 lg:mt-3 lg:flex lg:gap-4', desplegada ? 'flex' : 'hidden')}>
        {conFormula && (
          <button
            type="button"
            onClick={() => onImprimirFormula(historia.id)}
            disabled={imprimiendo}
            className={cn(BOTON_ACCION, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <Printer className="h-3.5 w-3.5" />
            {imprimiendo ? 'Generando...' : 'Imprimir fórmula'}
          </button>
        )}
        {onImprimirHistoria && (
          <button
            type="button"
            onClick={() => onImprimirHistoria(historia.id)}
            disabled={imprimiendoHistoria}
            className={cn(BOTON_ACCION, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
          >
            <FileText className="h-3.5 w-3.5" />
            {imprimiendoHistoria ? 'Generando...' : 'Imprimir historia'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(historia)}
          className={cn(BOTON_ACCION, 'bg-secondary text-secondary-foreground hover:brightness-95')}
        >
          {bloqueada ? 'Ver detalle' : 'Ver / Editar'}
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative pl-8">
      {/* Dot */}
      <div className="absolute left-0 top-4 flex h-5 w-5 items-center justify-center">
        <div
          className={`h-3 w-3 rounded-full border-2 ${
            bloqueada
              ? 'border-warning bg-warning-soft'
              : 'border-primary bg-accent'
          }`}
        />
      </div>

      <FilaDeslizable acciones={acciones} redondeo="rounded-2xl" className="rounded-2xl bg-card">
        {contenido}
      </FilaDeslizable>
    </div>
  )
}

export default function HistoriaClinicaTimeline({
  historias,
  isPending,
  onNuevaConsulta,
  onEditHistoria,
  onImprimirFormula,
  historiaImprimiendo = null,
  onImprimirHistoria,
  historiaImprimiendoCompleta = null,
}) {
  if (isPending) {
    return (
      <div className="relative space-y-4">
        <div className="absolute bottom-0 left-[9px] top-0 w-px bg-border" />
        <TimelineItemSkeleton />
        <TimelineItemSkeleton />
        <TimelineItemSkeleton />
      </div>
    )
  }

  if (!historias.length) {
    return <EmptyTimeline onNuevaConsulta={onNuevaConsulta} />
  }

  return (
    <div className="relative space-y-3 lg:space-y-4">
      <div className="absolute bottom-4 left-[9px] top-0 w-px bg-border" />

      {historias.map((historia) => (
        <TimelineCard
          key={historia.id}
          historia={historia}
          onEdit={onEditHistoria}
          onImprimirFormula={onImprimirFormula}
          imprimiendo={historiaImprimiendo === historia.id}
          onImprimirHistoria={onImprimirHistoria}
          imprimiendoHistoria={historiaImprimiendoCompleta === historia.id}
        />
      ))}

      <div className="relative pl-8">
        <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center">
          <div className="h-3 w-3 rounded-full border-2 border-border bg-muted" />
        </div>
        <p className="py-1 text-[13px] text-muted-foreground">Inicio del historial</p>
      </div>
    </div>
  )
}
