import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { canAccessModule } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'
import { ArrowRight, CalendarPlus, Phone, Receipt, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { etiquetaEspecie } from '@/lib/especies'
import { formatCurrency } from './dashboardUtils'
import { formatearCelular } from '@/lib/celular'

// Etiqueta y tono de cada estado de cita, en singular y en el lenguaje de la
// recepción («Atendida», no «Completadas»).
const ESTADOS = {
  programada: { label: 'Programada', className: 'bg-secondary text-secondary-foreground' },
  en_espera: { label: 'En espera', className: 'bg-brand-muted text-brand-foreground' },
  en_atencion: { label: 'En consulta', className: 'bg-primary text-primary-foreground' },
  completada: { label: 'Atendida', className: 'bg-success-soft text-success' },
  cancelada: { label: 'Cancelada', className: 'bg-danger-soft text-danger' },
  no_asistio: { label: 'No asistió', className: 'bg-muted text-muted-foreground' },
}

const PRIORIDAD_SELECCION = ['en_atencion', 'en_espera', 'programada']

// "14:30:00" → { hora: "2:30", sufijo: "p. m." }
const partirHora = (valor) => {
  if (!valor) return { hora: '—', sufijo: '' }
  const [h = '0', m = '00'] = String(valor).split(':')
  const horas = Number(h)
  const hora12 = horas % 12 === 0 ? 12 : horas % 12
  return { hora: `${hora12}:${m.padStart(2, '0')}`, sufijo: horas < 12 ? 'a. m.' : 'p. m.' }
}

const minutosDelDia = (valor) => {
  const [h = '0', m = '0'] = String(valor || '').split(':')
  return Number(h) * 60 + Number(m)
}

const historiaHref = (cita) => (cita?.mascota?.id ? `/pacientes/${cita.mascota.id}/historial` : '/pacientes')

// Se cobra en Caja. Con historia, Caja precarga sus insumos (igual que el botón
// de cobrar dentro de la historia clínica).
const cobroEstado = (cita) => (cita?.historia?.id ? { facturarHistoriaId: cita.historia.id } : undefined)

function ChipEstado({ estado }) {
  const config = ESTADOS[estado] || ESTADOS.programada
  return (
    <span className={cn('whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-semibold', config.className)}>
      {config.label}
    </span>
  )
}

function Avatar({ mascota, className }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-accent font-bold text-primary',
        className
      )}
    >
      {mascota?.fotoPerfil ? (
        <img src={mascota.fotoPerfil} alt="" className="h-full w-full object-cover" />
      ) : (
        mascota?.nombre?.[0]?.toUpperCase() || '?'
      )}
    </span>
  )
}

function LineaAhora({ etiqueta }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1" aria-hidden="true">
      <span className="rounded bg-brand px-2 py-0.5 text-xs font-bold text-foreground">Ahora {etiqueta}</span>
      <span className="h-0.5 flex-1 bg-brand" />
    </div>
  )
}

function PanelPaciente({ cita, puedeAtender, puedeCobrar }) {
  if (!cita) return null
  const especie = etiquetaEspecie(cita.mascota?.especie)

  return (
    <section aria-labelledby="hoy-seleccion" className="flex flex-col gap-5 rounded-2xl bg-card p-6">
      <div className="flex items-center gap-4">
        <Avatar mascota={cita.mascota} className="h-16 w-16 rounded-2xl text-2xl" />
        <div className="min-w-0">
          <h2 id="hoy-seleccion" className="truncate text-3xl font-semibold leading-none tracking-[-0.03em]">
            {cita.mascota?.nombre || 'Paciente sin nombre'}
          </h2>
          <p className="mt-1.5 truncate text-sm text-muted-foreground">
            {[especie, cita.consultorio?.nombre].filter(Boolean).join(' · ') || 'Sin especie registrada'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-[15px]">
        <div className="min-w-0">
          <dt className="text-[13px] text-muted-foreground">Tutor</dt>
          <dd className="mt-1 truncate font-medium">{cita.propietario?.nombre || 'Sin tutor'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[13px] text-muted-foreground">Teléfono</dt>
          <dd className="mt-1 truncate font-medium">
            {cita.propietario?.telefono ? (
              <a href={`tel:${cita.propietario.telefono}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-3.5 w-3.5" />
                {formatearCelular(cita.propietario.telefono)}
              </a>
            ) : (
              'Sin teléfono'
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[13px] text-muted-foreground">Atiende</dt>
          <dd className="mt-1 truncate font-medium">{cita.veterinario?.nombre || 'Por asignar'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[13px] text-muted-foreground">Historia</dt>
          <dd className="mt-1 truncate font-medium">{cita.historia?.id ? 'Registrada' : 'Sin registrar'}</dd>
        </div>
      </dl>

      <div className="rounded-xl bg-muted px-4 py-3.5">
        <p className="text-[13px] text-muted-foreground">Nota de recepción</p>
        <p className="mt-1 text-[15px] leading-6">
          {cita.observaciones || cita.motivo || 'Sin notas de recepción'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {puedeAtender ? (
          <Link
            to={historiaHref(cita)}
            className="inline-flex h-12 flex-1 basis-40 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px"
          >
            <Stethoscope className="h-4 w-4" />
            Abrir historia
          </Link>
        ) : null}
        {puedeCobrar ? (
          <Link
            to="/caja"
            state={cobroEstado(cita)}
            className="inline-flex h-12 flex-1 basis-32 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px"
          >
            <Receipt className="h-4 w-4" />
            Cobrar consulta
          </Link>
        ) : null}
      </div>
    </section>
  )
}

/**
 * La pantalla Hoy: el día de la clínica como una sola lista ordenada por hora,
 * con la línea de «ahora», y a la derecha el paciente elegido, la caja del día
 * y lo que hay que revisar. Reemplaza la tira de cifras y el «puente operativo».
 */
export default function JornadaHoy({
  citas,
  loading,
  cajaHoy,
  alertas,
  puedeAtender,
  puedeCobrar,
  puedeVerCaja,
  // Si quien mira también atiende (admin y veterinario a la vez), puede
  // quedarse solo con sus pacientes.
  usuarioIdMios = null,
}) {
  const [consultorio, setConsultorio] = useState('todos')
  const [soloMios, setSoloMios] = useState(false)
  const [seleccionId, setSeleccionId] = useState(null)
  const navigate = useNavigate()
  const usuario = useAuthStore((state) => state.usuario)
  // Tocar una cita lleva a Recepción con esa cita abierta, donde se cambia su
  // estado. Quien no entra a Agenda solo la ve en el panel de la derecha.
  const veRecepcion = canAccessModule(usuario, 'agenda')
  const abrirCita = (cita) =>
    veRecepcion ? navigate(`/agenda?tab=recepcion&cita=${cita.id}`) : setSeleccionId(cita.id)

  const ordenadas = useMemo(
    () => [...citas].sort((a, b) => minutosDelDia(a.horaInicio) - minutosDelDia(b.horaInicio)),
    [citas]
  )

  const consultorios = useMemo(() => {
    const nombres = new Map()
    ordenadas.forEach((cita) => {
      if (cita.consultorio?.id) nombres.set(cita.consultorio.id, cita.consultorio.nombre)
    })
    return [...nombres.entries()].map(([id, nombre]) => ({ id, nombre }))
  }, [ordenadas])

  const visibles = useMemo(
    () =>
      ordenadas
        .filter((c) => consultorio === 'todos' || c.consultorio?.id === consultorio)
        .filter((c) => !soloMios || c.veterinario?.id === usuarioIdMios),
    [consultorio, ordenadas, soloMios, usuarioIdMios]
  )

  const seleccionada = useMemo(() => {
    const elegida = visibles.find((c) => c.id === seleccionId)
    if (elegida) return elegida
    for (const estado of PRIORIDAD_SELECCION) {
      const candidata = visibles.find((c) => c.estado === estado)
      if (candidata) return candidata
    }
    return visibles[0] || null
  }, [seleccionId, visibles])

  const ahora = new Date()
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const etiquetaAhora = `${partirHora(`${ahora.getHours()}:${String(ahora.getMinutes()).padStart(2, '0')}`).hora}`
  const indiceAhora = visibles.findIndex((c) => minutosDelDia(c.horaInicio) > minutosAhora)

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="hoy-jornada" className="min-w-0 flex-[999_1_460px] rounded-2xl bg-card px-3 pb-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 px-3 pb-4">
          <h2 id="hoy-jornada" className="text-[22px] font-semibold tracking-[-0.02em]">
            La jornada
          </h2>
          <div className="flex flex-wrap items-center gap-2">
          {usuarioIdMios ? (
            <div role="group" aria-label="Pacientes" className="flex gap-1 rounded-xl bg-muted p-1">
              {[
                { id: false, nombre: 'Todos' },
                { id: true, nombre: 'Mis pacientes' },
              ].map((opcion) => (
                <button
                  key={String(opcion.id)}
                  type="button"
                  aria-pressed={soloMios === opcion.id}
                  onClick={() => setSoloMios(opcion.id)}
                  className={cn(
                    'h-9 rounded-lg px-3.5 text-[13px] transition',
                    soloMios === opcion.id
                      ? 'bg-card font-semibold text-foreground'
                      : 'font-medium text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opcion.nombre}
                </button>
              ))}
            </div>
          ) : null}
          {consultorios.length > 1 ? (
            <div role="group" aria-label="Consultorio" className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
              {[{ id: 'todos', nombre: 'Todos' }, ...consultorios].map((opcion) => (
                <button
                  key={opcion.id}
                  type="button"
                  aria-pressed={consultorio === opcion.id}
                  onClick={() => setConsultorio(opcion.id)}
                  className={cn(
                    'h-9 rounded-lg px-3.5 text-[13px] transition',
                    consultorio === opcion.id
                      ? 'bg-card font-semibold text-foreground'
                      : 'font-medium text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opcion.nombre}
                </button>
              ))}
            </div>
          ) : null}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 px-3" aria-label="Cargando la agenda de hoy">
            {[0, 1, 2, 3, 4].map((fila) => (
              <div key={fila} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="mx-3 flex flex-col items-start gap-3 rounded-xl bg-muted px-5 py-8">
            <p className="text-lg font-semibold">No hay citas para hoy</p>
            <p className="max-w-md text-[15px] leading-6 text-muted-foreground">
              Cuando recepción agende pacientes, aparecerán aquí en orden de llegada, con el que sigue resaltado.
            </p>
            <Link
              to="/agenda"
              className="mt-1 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              <CalendarPlus className="h-4 w-4" />
              Agendar una cita
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {visibles.map((cita, indice) => {
              const { hora, sufijo } = partirHora(cita.horaInicio)
              const activa = seleccionada?.id === cita.id
              const terminada = ['completada', 'cancelada', 'no_asistio'].includes(cita.estado)
              return (
                <li key={cita.id}>
                  {indice === indiceAhora ? <LineaAhora etiqueta={etiquetaAhora} /> : null}
                  <button
                    type="button"
                    onClick={() => abrirCita(cita)}
                    title={veRecepcion ? 'Abrir en Recepción para cambiar su estado' : undefined}
                    aria-pressed={activa}
                    className={cn(
                      'grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-3.5 text-left transition-colors',
                      activa ? 'bg-accent' : 'hover:bg-muted'
                    )}
                  >
                    <span className={cn('flex flex-col leading-tight', terminada && 'opacity-60')}>
                      <span className="text-[15px] font-semibold tabular-nums text-muted-foreground">{hora}</span>
                      <span className="text-xs text-muted-foreground">{sufijo}</span>
                    </span>
                    <span className={cn('flex min-w-0 flex-col gap-0.5', terminada && 'opacity-60')}>
                      <span className="truncate text-base font-semibold">
                        {cita.mascota?.nombre || 'Paciente sin nombre'}
                        <span className="font-normal text-muted-foreground">
                          {' · '}
                          {etiquetaEspecie(cita.mascota?.especie) || 'Sin especie'}
                        </span>
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {[cita.motivo, cita.propietario?.nombre].filter(Boolean).join(' · ') || 'Sin motivo'}
                      </span>
                    </span>
                    <ChipEstado estado={cita.estado} />
                  </button>
                </li>
              )
            })}
            {indiceAhora === -1 && visibles.length > 0 ? <LineaAhora etiqueta={etiquetaAhora} /> : null}
          </ol>
        )}
      </section>

      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
        <PanelPaciente cita={seleccionada} puedeAtender={puedeAtender} puedeCobrar={puedeCobrar} />

        {puedeVerCaja ? (
          <section
            aria-labelledby="hoy-caja"
            className="flex flex-col gap-4 rounded-2xl bg-primary p-6 text-primary-foreground dark:bg-secondary dark:text-foreground"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="hoy-caja" className="text-lg font-semibold">Caja de hoy</h2>
                <p className="mt-0.5 text-[13px] opacity-80">
                  {cajaHoy?.turnoApertura ? `Turno abierto ${cajaHoy.turnoApertura}` : 'Sin turno abierto'}
                </p>
              </div>
              <Link to="/caja" className="inline-flex items-center gap-1 text-[13px] font-semibold opacity-85 hover:opacity-100">
                Ir a caja
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {formatCurrency(cajaHoy?.total ?? 0)}
            </p>
            {cajaHoy?.porMetodo?.length ? (
              <dl className="flex flex-col gap-2 text-[15px]">
                {cajaHoy.porMetodo.map((metodo) => (
                  <div key={metodo.key} className="flex items-center justify-between gap-3">
                    <dt className="opacity-80">{metodo.label}</dt>
                    <dd className="font-semibold tabular-nums">{formatCurrency(metodo.valor)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm opacity-80">Todavía no hay cobros hoy</p>
            )}
          </section>
        ) : null}

        <section aria-labelledby="hoy-revisar" className="flex flex-col gap-1.5 rounded-2xl bg-card p-6">
          <h2 id="hoy-revisar" className="mb-2 text-lg font-semibold">Para revisar</h2>
          {alertas.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">Todo en orden por ahora.</p>
          ) : (
            alertas.map((alerta) => (
              <Link
                key={alerta.id}
                to={alerta.to}
                state={alerta.state}
                className="-mx-3 flex items-start gap-3.5 rounded-xl p-3 transition hover:bg-muted"
              >
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px] bg-brand" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{alerta.title}</span>
                  <span className="text-sm leading-5 text-muted-foreground">{alerta.detail}</span>
                </span>
              </Link>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
