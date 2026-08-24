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
export function RecepcionTab({ fecha, prefill, usuario, puedeProgramar, puedeGestionarEstado }) {
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
        lastUpdatedAt={lastUpdatedAt}
        headerActions={
          puedeProgramar ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawer('programar')}
                className="flex h-10 items-center gap-2 border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                <CalendarPlus className="h-4 w-4 text-muted-foreground" />
                Programar cita
              </button>
              <button
                type="button"
                onClick={() => setDrawer('walk-in')}
                className="flex h-10 items-center gap-2 border border-red-500 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
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
          consultorios={consultorios}
          mascotas={mascotas}
          usuario={usuario}
          puedeProgramar={puedeProgramar}
          crearCitaMutation={crearCitaMutation}
          onSuccess={cerrarDrawer}
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
