import { useState } from 'react'
import { CalendarPlus, UserPlus } from 'lucide-react'
import { useRecepcion, getErrorMessage } from './useRecepcion'
import { ProgramarCitaPanel } from './ProgramarCitaPanel'
import { SalaEsperaPanel } from './SalaEsperaPanel'
import { WalkInPanel } from './WalkInPanel'
import { RecepcionDrawer } from './RecepcionDrawer'

/**
 * Layout de Recepción: la sala de espera del día ocupa todo el ancho y es lo
 * único permanente. Programar cita e ingreso directo dejaron de ser columnas
 * fijas y se abren bajo demanda en un panel lateral.
 */
export function RecepcionTab({
  fecha,
  prefill,
  usuario,
  puedeProgramar,
  puedeGestionarEstado,
  onCitaProgramada,
  citaInicialId = null,
}) {
  const tienePrefill = Boolean(prefill?.fecha || prefill?.horaInicio)
  const [drawer, setDrawer] = useState(() => (tienePrefill ? 'programar' : null))
  const [prefillVisto, setPrefillVisto] = useState(prefill)

  /**
   * Un clic en un hueco del calendario precarga el formulario y lo abre. Se
   * ajusta durante el render (no en un efecto) para no encadenar renders:
   * AgendaPage crea un objeto prefill nuevo en cada clic.
   */
  if (prefill !== prefillVisto) {
    setPrefillVisto(prefill)
    if (tienePrefill) setDrawer('programar')
  }

  const {
    salaEsperaQuery,
    salaEspera,
    resumen,
    veterinariosDisponibilidad,
    consultorios,
    veterinarios,
    veterinariosQuery,
    mascotas,
    crearCitaMutation,
    crearWalkInMutation,
    actualizarEstadoMutation,
  } = useRecepcion({ fecha })

  const lastUpdatedAt = salaEsperaQuery.dataUpdatedAt ? new Date(salaEsperaQuery.dataUpdatedAt) : null

  const cerrarDrawer = () => setDrawer(null)

  return (
    <div className="pt-5">
      <SalaEsperaPanel
        citas={salaEspera}
        resumen={resumen}
        isLoading={salaEsperaQuery.isLoading}
        isError={salaEsperaQuery.isError}
        errorMessage={getErrorMessage(salaEsperaQuery.error, 'No fue posible cargar la sala de espera.')}
        puedeGestionarEstado={puedeGestionarEstado}
        actualizarEstadoMutation={actualizarEstadoMutation}
        citaInicialId={citaInicialId}
        lastUpdatedAt={lastUpdatedAt}
        headerActions={
          puedeProgramar ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawer('programar')}
                className="flex h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarPlus className="h-4 w-4" />
                Programar cita
              </button>
              <button
                type="button"
                onClick={() => setDrawer('walk-in')}
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <UserPlus className="h-4 w-4" />
                Ingreso directo
              </button>
            </div>
          ) : null
        }
      />

      <RecepcionDrawer
        open={drawer === 'programar'}
        onClose={cerrarDrawer}
        title="Programar nueva cita"
        subtitle="Al confirmar, la cita entra a la sala de espera como pendiente de llegada."
      >
        <ProgramarCitaPanel
          bare
          prefill={prefill}
          veterinarios={veterinarios}
          veterinariosCargando={veterinariosQuery.isPending}
          consultorios={consultorios}
          mascotas={mascotas}
          usuario={usuario}
          puedeProgramar={puedeProgramar}
          crearCitaMutation={crearCitaMutation}
          onSuccess={() => {
            cerrarDrawer()
            onCitaProgramada?.()
          }}
        />
      </RecepcionDrawer>

      <RecepcionDrawer
        open={drawer === 'walk-in'}
        onClose={cerrarDrawer}
        title="Ingreso directo"
        subtitle="Paciente que llega sin cita. Entra a la sala de espera de inmediato."
      >
        <WalkInPanel
          bare
          veterinariosDisponibilidad={veterinariosDisponibilidad}
          consultorios={consultorios}
          mascotas={mascotas}
          puedeProgramar={puedeProgramar}
          crearWalkInMutation={crearWalkInMutation}
          onSuccess={cerrarDrawer}
        />
      </RecepcionDrawer>
    </div>
  )
}
