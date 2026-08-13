import { useRecepcion, getErrorMessage } from './useRecepcion'
import { ProgramarCitaPanel } from './ProgramarCitaPanel'
import { SalaEsperaPanel } from './SalaEsperaPanel'
import { WalkInPanel } from './WalkInPanel'

/**
 * Layout de 3 columnas de Recepción: programar (izquierda), sala de espera
 * del día (centro, protagonista) e ingreso directo / walk-in (derecha).
 * Reemplaza el antiguo tab "Gestión de citas" de AgendaPage.
 */
export function RecepcionTab({ fecha, prefill, usuario, puedeProgramar, puedeGestionarEstado }) {
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

  return (
    <div className="grid gap-5 pt-5 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
      <div className="order-2 xl:order-1">
        <ProgramarCitaPanel
          prefill={prefill}
          veterinarios={veterinarios}
          consultorios={consultorios}
          mascotas={mascotas}
          usuario={usuario}
          puedeProgramar={puedeProgramar}
          crearCitaMutation={crearCitaMutation}
        />
      </div>

      <div className="order-1 xl:order-2">
        <SalaEsperaPanel
          citas={salaEspera}
          resumen={resumen}
          isLoading={salaEsperaQuery.isLoading}
          isError={salaEsperaQuery.isError}
          errorMessage={getErrorMessage(salaEsperaQuery.error, 'No fue posible cargar la sala de espera.')}
          puedeGestionarEstado={puedeGestionarEstado}
          actualizarEstadoMutation={actualizarEstadoMutation}
          lastUpdatedAt={lastUpdatedAt}
        />
      </div>

      <div className="order-3">
        <WalkInPanel
          veterinariosDisponibilidad={veterinariosDisponibilidad}
          consultorios={consultorios}
          mascotas={mascotas}
          puedeProgramar={puedeProgramar}
          crearWalkInMutation={crearWalkInMutation}
        />
      </div>
    </div>
  )
}
