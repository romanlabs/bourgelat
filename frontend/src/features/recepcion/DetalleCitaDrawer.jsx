import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RecepcionDrawer } from './RecepcionDrawer'
import { ACCION_LABELS, ORIGEN_LABELS, TRANSICIONES, TYPE_OPTIONS } from './recepcionConstants'

const formatTime = (value) => value?.slice(0, 5) || '--:--'

const tipoLabel = (value) => TYPE_OPTIONS.find((option) => option.value === value)?.label || value

const ACTION_TONE = {
  en_espera: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
  en_atencion: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
  completada: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  cancelada: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  no_asistio: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
}

function Dato({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{children}</span>
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
                className={`border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  ACTION_TONE[estado] || 'border-border bg-muted text-foreground'
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
            <p className="text-lg font-semibold leading-7 tracking-[-0.01em] text-foreground">
              {cita.mascota?.nombre || 'Paciente'}
            </p>
            <p className="text-xs text-muted-foreground">{cita.mascota?.especie || 'Especie sin registrar'}</p>
          </div>

          <StatusBadge variant={cita.estado} showDot size="sm" className="justify-self-start" />

          <div className="grid gap-2.5 border-t border-border pt-4">
            <Dato label="Tutor">{cita.propietario?.nombre || 'Sin tutor'}</Dato>
            <Dato label="Telefono">
              {cita.propietario?.telefono ? (
                <a href={`tel:${cita.propietario.telefono}`} className="tabular-nums text-primary hover:underline">
                  {cita.propietario.telefono}
                </a>
              ) : (
                <span className="text-muted-foreground">Sin registrar</span>
              )}
            </Dato>
            <Dato label="Veterinario">{cita.veterinario?.nombre || 'Sin profesional'}</Dato>
            <Dato label="Consultorio">{cita.consultorio?.nombre || 'Sin asignar'}</Dato>
          </div>

          <div className="grid gap-2.5 border-t border-border pt-4">
            <Dato label="Horario">
              <span className="tabular-nums">
                {formatTime(cita.horaInicio)} – {formatTime(cita.horaFin)}
              </span>
            </Dato>
            <Dato label="Llegada">
              {cita.horaLlegada ? (
                <span className="tabular-nums">{formatTime(cita.horaLlegada)}</span>
              ) : (
                <span className="text-muted-foreground">Aun no llega</span>
              )}
            </Dato>
            <Dato label="Inicio de atencion">
              {cita.horaInicioAtencion ? (
                <span className="tabular-nums">{formatTime(cita.horaInicioAtencion)}</span>
              ) : (
                <span className="text-muted-foreground">Sin iniciar</span>
              )}
            </Dato>
          </div>

          {cita.motivo ? (
            <div className="border-t border-border pt-4">
              <p className="mb-1.5 text-xs text-muted-foreground">Motivo</p>
              <p className="text-sm leading-6 text-foreground">{cita.motivo}</p>
            </div>
          ) : null}

          {cita.observaciones ? (
            <div className="border-t border-border pt-4">
              <p className="mb-1.5 text-xs text-muted-foreground">Observaciones</p>
              <p className="text-sm leading-6 text-foreground">{cita.observaciones}</p>
            </div>
          ) : null}

          {cita.motivoCancelacion ? (
            <div className="border-t border-border pt-4">
              <p className="mb-1.5 text-xs text-muted-foreground">Motivo de cancelacion</p>
              <p className="text-sm leading-6 text-foreground">{cita.motivoCancelacion}</p>
            </div>
          ) : null}

          {cita.mascotaId ? (
            <Link
              to={`/pacientes/${cita.mascotaId}/historial?citaId=${cita.id}`}
              className="border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Abrir historia clinica
            </Link>
          ) : null}
        </div>
      ) : null}
    </RecepcionDrawer>
  )
}
