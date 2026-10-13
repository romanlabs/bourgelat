import { useRecepcion } from './useRecepcion'
import { ProgramarCitaPanel } from './ProgramarCitaPanel'
import { RecepcionDrawer } from './RecepcionDrawer'

/**
 * Programar cita desde un hueco del calendario, sin salir de la agenda: el
 * panel se abre encima y al guardar la cita aparece en el mismo calendario.
 */
export function ProgramarCitaDrawer({ prefill, usuario, puedeProgramar, onClose }) {
  const { consultorios, veterinarios, veterinariosQuery, mascotas, crearCitaMutation } = useRecepcion({
    fecha: prefill.fecha,
  })

  return (
    <RecepcionDrawer
      open
      onClose={onClose}
      title="Programar nueva cita"
      subtitle="Al confirmar, la cita queda en la agenda como programada."
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
        onSuccess={onClose}
      />
    </RecepcionDrawer>
  )
}
