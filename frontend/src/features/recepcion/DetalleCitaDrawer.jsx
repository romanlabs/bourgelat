import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RecepcionDrawer } from './RecepcionDrawer'
import { ACCION_LABELS, ORIGEN_LABELS, TRANSICIONES, TYPE_OPTIONS } from './recepcionConstants'
import { etiquetaEspecie } from '@/lib/especies'

const formatTime = (value) => value?.slice(0, 5) || '--:--'

const tipoLabel = (value) => TYPE_OPTIONS.find((option) => option.value === value)?.label || value

// Igual que en la sala de espera: «Iniciar atención» es la acción fuerte.
const ACTION_TONE = {
  en_espera: 'bg-secondary text-secondary-foreground hover:brightness-95',
  en_atencion: 'bg-primary text-primary-foreground hover:brightness-110',
  completada: 'bg-success-soft text-success hover:brightness-95',
  cancelada: 'bg-danger-soft text-danger hover:brightness-95',
  no_asistio: 'bg-muted text-muted-foreground hover:brightness-95',
}

function Dato({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className="text-right text-[15px] font-medium text-foreground">{children}</span>
    </div>
  )
}

/**
 * Detalle del paciente seleccionado en la sala de espera. Muestra los campos
 * que el endpoint /citas/sala-espera ya devuelve y que la tabla anterior
 * descartaba: especie, telefono del tutor, motivo, observaciones y las horas
 * selladas de llegada e inicio de atencion.
 */
export function DetalleCitaDrawer({ cita, onClose, puedeGestionarEstado, onAccion, isPending }) {
  const transiciones = cita ? TRANSICIONES[cita.estado] || [] : []

  return (
    <RecepcionDrawer
      open={Boolean(cita)}
      onClose={onClose}
      title="Detalle del paciente"
      subtitle={cita ? `${tipoLabel(cita.tipoCita)} · ${ORIGEN_LABELS[cita.origen] || cita.origen}` : undefined}
      width="sm:w-[400px]"
      footer={
        cita && puedeGestionarEstado && transiciones.length > 0 ? (
          <div className="grid gap-2">
            {transiciones.map((estado) => (
              <button
                key={estado}
                type="button"
                disabled={isPending}
                onClick={() => onAccion(cita, estado)}
                className={`h-11 rounded-lg px-4 text-sm font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                  ACTION_TONE[estado] || 'bg-muted text-foreground'
                }`}
              >
                {ACCION_LABELS[estado]}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      {cita ? (
        <div className="grid gap-5">
          <div>
            <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-foreground">
              {cita.mascota?.nombre || 'Paciente'}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{etiquetaEspecie(cita.mascota?.especie) || 'Especie sin registrar'}</p>
          </div>

          <StatusBadge variant={cita.estado} showDot size="sm" className="justify-self-start" />

          <div className="grid gap-2.5 rounded-xl bg-muted px-4 py-3.5">
            <Dato label="Tutor">{cita.propietario?.nombre || 'Sin tutor'}</Dato>
            <Dato label="Telefono">
              {cita.propietario?.telefono ? (
                <a href={`tel:${cita.propietario.telefono}`} className="tabular-nums text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  {cita.propietario.telefono}
                </a>
              ) : (
                <span className="text-muted-foreground">Sin registrar</span>
              )}
            </Dato>
            <Dato label="Veterinario">{cita.veterinario?.nombre || 'Sin profesional'}</Dato>
            <Dato label="Consultorio">{cita.consultorio?.nombre || 'Sin asignar'}</Dato>
          </div>

          <div className="grid gap-2.5 rounded-xl bg-muted px-4 py-3.5">
            <Dato label="Horario">
              <span className="tabular-nums">
                {formatTime(cita.horaInicio)} – {formatTime(cita.horaFin)}
              </span>
            </Dato>
            <Dato label="Llegada">
              {cita.horaLlegada ? (
                <span className="tabular-nums">{formatTime(cita.horaLlegada)}</span>
              ) : (
                <span className="text-muted-foreground">Aún no llega</span>
              )}
            </Dato>
            <Dato label="Inicio de atención">
              {cita.horaInicioAtencion ? (
                <span className="tabular-nums">{formatTime(cita.horaInicioAtencion)}</span>
              ) : (
                <span className="text-muted-foreground">Sin iniciar</span>
              )}
            </Dato>
          </div>

          {cita.motivo ? (
            <div className="rounded-xl bg-muted px-4 py-3.5">
              <p className="mb-1 text-[13px] text-muted-foreground">Motivo</p>
              <p className="text-[15px] leading-6 text-foreground">{cita.motivo}</p>
            </div>
          ) : null}

          {cita.observaciones ? (
            <div className="rounded-xl bg-muted px-4 py-3.5">
              <p className="mb-1 text-[13px] text-muted-foreground">Observaciones</p>
              <p className="text-[15px] leading-6 text-foreground">{cita.observaciones}</p>
            </div>
          ) : null}

          {cita.motivoCancelacion ? (
            <div className="rounded-xl bg-muted px-4 py-3.5">
              <p className="mb-1 text-[13px] text-muted-foreground">Motivo de cancelación</p>
              <p className="text-[15px] leading-6 text-foreground">{cita.motivoCancelacion}</p>
            </div>
          ) : null}

          {cita.mascotaId ? (
            <Link
              to={`/pacientes/${cita.mascotaId}/historial?citaId=${cita.id}`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Abrir historia clínica
            </Link>
          ) : null}
        </div>
      ) : null}
    </RecepcionDrawer>
  )
}
