import { useState } from 'react'
import { hoyLocal } from '@/lib/fecha'
import { aFechaLocal, soloDia } from '@/features/pacientes/fichaSaludUtils'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const VISIBLES = 8

// «10 mar. 2026»: corta para que quepa en una línea al lado del evento.
const fechaEvento = (fecha) => {
  const d = aFechaLocal(fecha)
  return `${d.getDate()} ${d.toLocaleDateString('es-CO', { month: 'short' })} ${d.getFullYear()}`
}

// Junta consultas y antecedentes con fecha en una sola historia, de lo más
// reciente a lo más antiguo.
function eventosDe({ historias, antecedentes, mascota }) {
  const eventos = []
  const agregar = (fecha, titulo, detalle, tono = 'normal') => {
    if (fecha) eventos.push({ fecha: soloDia(fecha), titulo, detalle, tono })
  }

  for (const h of historias) {
    agregar(
      h.fechaConsulta || h.createdAt,
      h.motivoConsulta || 'Consulta',
      [h.diagnostico, h.veterinario?.nombre].filter(Boolean).join(' · ')
    )
  }
  for (const v of antecedentes?.vacunas || []) {
    agregar(v.fecha, `Vacuna: ${v.nombre || 'sin nombre'}`, v.laboratorio || '')
  }
  for (const d of antecedentes?.desparasitaciones || []) {
    agregar(d.fecha, `Desparasitación ${String(d.tipo || '').toLowerCase()}`.trim(), d.producto || '')
  }
  for (const c of antecedentes?.cirugias || []) {
    agregar(c.fecha, `Cirugía: ${c.nombre || 'sin nombre'}`, [c.veterinario, c.observaciones].filter(Boolean).join(' · '))
  }
  for (const a of antecedentes?.alergias || []) {
    agregar(a.fecha, `Se detecta alergia: ${a.descripcion || a.tipo || 'sin detalle'}`, a.reaccion || '', 'alerta')
  }
  for (const c of antecedentes?.condicionesCronicas || []) {
    agregar(c.fechaDiagnostico, `Diagnóstico: ${c.nombre || 'condición crónica'}`, c.tratamientoActual || '')
  }
  if (antecedentes?.esterilizado && antecedentes.fechaEsterilizacion) {
    agregar(antecedentes.fechaEsterilizacion, 'Esterilización', '')
  }
  if (mascota?.createdAt) agregar(mascota.createdAt, 'Registro en la clínica', '')

  return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export default function VidaEnLaClinica({ historias, antecedentes, mascota, cargando }) {
  const [verTodo, setVerTodo] = useState(false)
  const eventos = eventosDe({ historias, antecedentes, mascota })
  const visibles = verTodo ? eventos : eventos.slice(0, VISIBLES)
  const hoy = hoyLocal()

  return (
    <section aria-labelledby="ant-vida" className="flex flex-col gap-4 rounded-2xl bg-primary p-6 text-primary-foreground">
      <h2 id="ant-vida" className="text-lg font-semibold tracking-[-0.02em]">
        Su vida en la clínica
      </h2>
      {cargando ? (
        <div className="h-24 animate-pulse rounded-xl bg-primary-foreground/10" />
      ) : eventos.length === 0 ? (
        <p className="rounded-xl bg-primary-foreground/10 px-4 py-3.5 text-sm opacity-90">
          Aquí aparecerán sus consultas, vacunas y cirugías a medida que se registren.
        </p>
      ) : (
        <ol className="flex flex-col">
          {visibles.map((evento, i) => (
            <li key={`${evento.fecha}-${i}`} className="grid grid-cols-[92px_20px_minmax(0,1fr)] gap-x-3">
              <span className="whitespace-nowrap pt-0.5 text-right text-[13px] tabular-nums opacity-75">
                {evento.fecha === hoy ? 'Hoy' : fechaEvento(evento.fecha)}
              </span>
              <span className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    evento.tono === 'alerta' ? 'bg-brand' : 'bg-primary-foreground'
                  }`}
                />
                {i < visibles.length - 1 ? <span className="w-px flex-1 bg-primary-foreground/25" /> : null}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pb-5">
                <span className={`text-[15px] font-semibold ${evento.tono === 'alerta' ? 'text-brand' : ''}`}>
                  {evento.titulo}
                </span>
                {evento.detalle ? <span className="text-sm opacity-75">{evento.detalle}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      {eventos.length > VISIBLES ? (
        <button
          type="button"
          onClick={() => setVerTodo((v) => !v)}
          className={`inline-flex h-10 items-center self-start rounded-lg bg-primary-foreground/15 px-4 text-sm font-semibold transition hover:bg-primary-foreground/25 active:translate-y-px ${FOCO}`}
        >
          {verTodo ? 'Ver menos' : `Ver todo (${eventos.length})`}
        </button>
      ) : null}
    </section>
  )
}
