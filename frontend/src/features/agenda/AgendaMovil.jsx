import { useEffect, useState } from 'react'
import { addDays, format, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText, Info, Phone, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fechaLocal, hoyLocal } from '@/lib/fecha'
import { useDeslizarHorizontal, useMantenerPresionado } from '@/lib/gestos'
import FilaDeslizable from '@/components/movil/FilaDeslizable'
import TirarParaRefrescar from '@/components/movil/TirarParaRefrescar'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import { accionesAlDeslizar, accionesDeCita, ICONO_ACCION, TONO_ACCION } from './accionesCita'
import { HojaOpcionesCita } from './HojaOpcionesCita'
import {
  buildStateTone,
  buildTipoTone,
  parseMinutes,
  STATUS_OPTIONS,
  TIPO_SHORT,
} from './calendarConstants'

const ESTADO_LABEL = Object.fromEntries(STATUS_OPTIONS.map((opt) => [opt.value, opt.label]))
const ESTADOS_APAGADOS = ['completada', 'cancelada', 'no_asistio']

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

// Que el gesto de una tarjeta (deslizar para ver acciones) no cambie además de día.
const aislarToque = {
  onTouchStart: (event) => event.stopPropagation(),
  onTouchEnd: (event) => event.stopPropagation(),
}

function formatDuracion(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return ''
  const minutos = parseMinutes(horaFin) - parseMinutes(horaInicio)
  if (!(minutos > 0)) return ''
  if (minutos < 60) return `${minutos} min`
  const resto = minutos % 60
  return `${Math.floor(minutos / 60)} h${resto ? ` ${resto} min` : ''}`
}

function TarjetaCita({ cita, esProxima, onClick, onMantener }) {
  const tipo = TIPO_SHORT[cita.tipoCita] || cita.tipoCita
  const duracion = formatDuracion(cita.horaInicio, cita.horaFin)
  const detalle = [cita.motivo || tipo, duracion].filter(Boolean).join(' · ')
  const mostrarEstado = cita.estado && cita.estado !== 'programada'
  const presion = useMantenerPresionado(() => onMantener(cita))

  return (
    <button
      type="button"
      {...presion.props}
      onClick={() => {
        if (presion.consumido()) return
        onClick(cita)
      }}
      className={cn(
        'grid min-h-[64px] w-full select-none grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-card p-3.5 text-left transition [-webkit-touch-callout:none] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        esProxima && 'bg-accent',
        cita.estado === 'en_atencion' && 'ring-2 ring-inset ring-primary',
        ESTADOS_APAGADOS.includes(cita.estado) && 'opacity-60'
      )}
    >
      <span className="text-[15px] font-semibold tabular-nums text-muted-foreground">
        {cita.horaInicio?.slice(0, 5)}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-base font-semibold text-foreground',
            ['cancelada', 'no_asistio'].includes(cita.estado) && 'line-through'
          )}
        >
          {cita.mascota?.nombre || 'Paciente'}
        </span>
        <span className="truncate text-[13px] tabular-nums text-muted-foreground">{detalle}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span
          className={cn(
            'whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold',
            buildTipoTone(cita.tipoCita)
          )}
        >
          {tipo}
        </span>
        {mostrarEstado ? (
          <span
            className={cn(
              'whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold',
              buildStateTone(cita.estado)
            )}
          >
            {ESTADO_LABEL[cita.estado] || cita.estado}
          </span>
        ) : null}
      </span>
    </button>
  )
}

const BOTON_NAV =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Agenda en el celular: la semana como botones de día y las citas del día
 * elegido en tarjetas. Usa la misma consulta del calendario de escritorio
 * (vista semana); el día elegido es la fecha base del calendario.
 *
 * Gestos (todos tienen su botón): deslizar sobre la lista cambia de día y
 * sobre la tira de días cambia de semana; tirar hacia abajo actualiza;
 * deslizar una cita muestra sus atajos y mantenerla presionada, sus opciones.
 */
export function AgendaMovil({
  veterinarioId,
  estado,
  enabled = true,
  puedeProgramar = false,
  puedeGestionarEstado = false,
  puedeReprogramar = false,
  onCitaClick,
  onNuevaCita,
  onResumenChange,
  onAccionEstado,
  onAbrirDetalle,
}) {
  const { prefs } = useCalendarView()
  const {
    fechaBase,
    diasVisibles,
    tituloRango,
    irAnterior,
    irSiguiente,
    irHoy,
    irADia,
    getCitasDelDia,
    getBloqueoDelDia,
    proximaCitaId,
    isLoading,
    refrescar,
  } = useAgendaCalendar({
    veterinarioId,
    estado,
    enabled,
    view: 'semana',
    // En el celular la semana siempre trae sus 7 días: el día elegido no puede quedar oculto.
    prefs: { ...prefs, mostrarFinesDeSemana: true },
  })
  const [citaOpciones, setCitaOpciones] = useState(null)
  const permisos = { puedeGestionarEstado, puedeReprogramar }

  const totalSemana = diasVisibles.reduce((suma, dia) => suma + getCitasDelDia(dia).length, 0)
  useEffect(() => {
    onResumenChange?.({ titulo: tituloRango, total: totalSemana, cargando: isLoading })
  }, [onResumenChange, tituloRango, totalSemana, isLoading])

  // Pasar del último día de la semana lleva a la siguiente: la semana sale de la fecha base.
  const diaAnterior = () => irADia(addDays(fechaBase, -1))
  const diaSiguiente = () => irADia(addDays(fechaBase, 1))
  const gestoDia = useDeslizarHorizontal({ onIzquierda: diaSiguiente, onDerecha: diaAnterior })
  const gestoSemana = useDeslizarHorizontal({ onIzquierda: irSiguiente, onDerecha: irAnterior })

  const citasDelDia = getCitasDelDia(fechaBase)
  const bloqueo = getBloqueoDelDia(fechaBase)
  const esHoy = isToday(fechaBase)
  const tituloDia = capitalizar(format(fechaBase, "EEEE d 'de' MMMM", { locale: es }))
  const anioActual = new Date().getFullYear()
  const rangoCorto = tituloRango.replace(` de ${anioActual}`, '').replace(` ${anioActual}`, '')

  const nuevaCita = () => {
    const fecha = fechaLocal(fechaBase)
    // Un día pasado no admite citas nuevas: el formulario abre en hoy.
    onNuevaCita?.(fecha < hoyLocal() ? hoyLocal() : fecha)
  }

  const ejecutar = (cita, accion) => {
    if (accion.tipo === 'estado') onAccionEstado?.(cita, accion.estado)
    else if (accion.tipo === 'reprogramar') onAbrirDetalle?.(cita, { seccion: 'reprogramar' })
    else if (accion.tipo === 'cancelar') onAbrirDetalle?.(cita, { estado: 'cancelada' })
  }

  const opcionesDe = (cita) => {
    if (!cita) return []
    const acciones = accionesDeCita(cita, permisos).map((accion) => ({
      key: accion.key,
      label: accion.label,
      icon: ICONO_ACCION[accion.key],
      tono: accion.tipo === 'cancelar' ? 'danger' : 'neutro',
      onClick: () => ejecutar(cita, accion),
    }))
    return [
      { key: 'detalle', label: 'Ver detalle', icon: Info, tono: 'neutro', onClick: () => onCitaClick(cita) },
      ...acciones,
      cita.mascota?.id
        ? {
            key: 'historia',
            label: 'Abrir historia clínica',
            icon: FileText,
            to: `/pacientes/${cita.mascota.id}/historial?citaId=${cita.id}`,
          }
        : null,
      cita.propietario?.telefono
        ? { key: 'llamar', label: `Llamar a ${cita.propietario.nombre || 'el tutor'}`, icon: Phone, href: `tel:${cita.propietario.telefono}` }
        : null,
    ].filter(Boolean)
  }

  return (
    <TirarParaRefrescar onRefrescar={refrescar}>
      {/* Espacio al final para el botón fijo y la barra inferior (más la zona segura). */}
      <div className="flex flex-col gap-2 pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
        {/* Semana: rango, «Hoy» y flechas en una sola fila */}
        <div className="flex items-center gap-1.5">
          <p className="min-w-0 flex-1 truncate pl-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{capitalizar(rangoCorto)}</span>
            {isLoading ? null : <span className="tabular-nums"> · {totalSemana} {totalSemana === 1 ? 'cita' : 'citas'}</span>}
          </p>
          {esHoy ? null : (
            <button
              type="button"
              onClick={irHoy}
              className="h-11 shrink-0 rounded-xl bg-card px-3.5 text-sm font-semibold text-primary transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Hoy
            </button>
          )}
          <button type="button" onClick={irAnterior} aria-label="Semana anterior" className={BOTON_NAV}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={irSiguiente} aria-label="Semana siguiente" className={BOTON_NAV}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div role="group" aria-label="Días de la semana" className="grid grid-cols-7 gap-1" {...gestoSemana}>
          {diasVisibles.map((dia) => {
            const elegido = isSameDay(dia, fechaBase)
            const hoy = isToday(dia)
            const total = getCitasDelDia(dia).length
            const corto = capitalizar(format(dia, 'EEEEEE', { locale: es }))
            const etiqueta = `${capitalizar(format(dia, "EEEE d 'de' MMMM", { locale: es }))}${hoy ? ', hoy' : ''}, ${total} ${total === 1 ? 'cita' : 'citas'}`
            return (
              <button
                key={dia.toISOString()}
                type="button"
                onClick={() => irADia(dia)}
                aria-pressed={elegido}
                aria-label={etiqueta}
                className={cn(
                  'flex h-[52px] min-w-0 flex-col items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  elegido ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
                )}
              >
                <span className={cn('text-[11px] font-medium leading-none', !elegido && 'text-muted-foreground')}>{corto}</span>
                <span className="mt-1 text-lg font-semibold leading-none tracking-[-0.02em] tabular-nums">
                  {format(dia, 'd')}
                </span>
                {/* Punto: hay citas ese día; anillo de marca en hoy */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1 h-1 w-1 rounded-full',
                    hoy ? 'bg-brand' : total > 0 ? (elegido ? 'bg-primary-foreground opacity-70' : 'bg-muted-foreground/60') : 'bg-transparent'
                  )}
                />
              </button>
            )
          })}
        </div>

        {/* Deslizar a los lados en esta zona cambia de día */}
        <div className="flex min-h-[50dvh] flex-col gap-2" {...gestoDia}>
          <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
            <h2 className="min-w-0 truncate text-base font-semibold tracking-[-0.01em] text-foreground">
              {tituloDia}
              {esHoy ? <span className="font-normal text-muted-foreground"> · hoy</span> : null}
            </h2>
            <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
              {isLoading ? 'Cargando…' : `${citasDelDia.length} ${citasDelDia.length === 1 ? 'cita' : 'citas'}`}
            </span>
          </div>

          {bloqueo ? (
            <div className="rounded-2xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
              Agenda bloqueada este día{bloqueo.motivo ? `: ${bloqueo.motivo}` : ''}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="h-[64px] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : citasDelDia.length === 0 ? (
            <div className="rounded-2xl bg-card px-5 py-9 text-center text-[15px] text-muted-foreground">
              No hay citas este día
              <span className="mt-1 block text-[13px]">Desliza a los lados para ver otro día</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {citasDelDia.map((cita) => {
                const atajos = accionesAlDeslizar(cita, permisos).map((accion) => ({
                  key: accion.key,
                  label: accion.key === 'en_espera' ? 'Llegó' : accion.key === 'en_atencion' ? 'Atender' : accion.label,
                  icon: ICONO_ACCION[accion.key],
                  tono: TONO_ACCION[accion.key] || 'primary',
                  onClick: () => ejecutar(cita, accion),
                }))
                return (
                  <li key={cita.id} {...(atajos.length ? aislarToque : {})}>
                    <FilaDeslizable acciones={atajos} redondeo="rounded-2xl">
                      <TarjetaCita
                        cita={cita}
                        esProxima={cita.id === proximaCitaId}
                        onClick={onCitaClick}
                        onMantener={setCitaOpciones}
                      />
                    </FilaDeslizable>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {puedeProgramar && onNuevaCita ? (
          <button
            type="button"
            onClick={nuevaCita}
            className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-dropdown transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
            Nueva cita
          </button>
        ) : null}
      </div>

      <HojaOpcionesCita
        abierta={Boolean(citaOpciones)}
        onCambiar={(abierta) => !abierta && setCitaOpciones(null)}
        titulo={citaOpciones?.mascota?.nombre || 'Cita'}
        descripcion={
          citaOpciones
            ? [citaOpciones.horaInicio?.slice(0, 5), ESTADO_LABEL[citaOpciones.estado]].filter(Boolean).join(' · ')
            : undefined
        }
        opciones={opcionesDe(citaOpciones)}
      />
    </TirarParaRefrescar>
  )
}
