import { Link } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { esSoloLectura, estaEnPrueba, diasRestantesPrueba } from '@/lib/suscripcion'

// Aviso persistente del estado de la suscripción. En solo lectura el mensaje
// deja claro que los datos siguen ahí y se pueden exportar: la clínica maneja
// historias clínicas y no puede sentir que se las secuestraron.
// soloLecturaOnly: oculta el aviso de "dias de prueba" (informativo, se ve solo en
// el panel de control) y deja unicamente el aviso critico de suscripcion vencida,
// que si debe verse en cualquier modulo porque bloquea la escritura ahi mismo.
const SuscripcionBanner = ({ soloLecturaOnly = false }) => {
  const suscripcion = useAuthStore((state) => state.suscripcion)

  if (esSoloLectura(suscripcion)) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="flex-1">
          Tu suscripción venció. Puedes consultar y exportar toda tu información, pero no crear ni
          editar registros.
        </p>
        <Link
          to="/configuracion"
          className="rounded-md bg-destructive px-3 py-1.5 font-medium text-destructive-foreground"
        >
          Activar plan
        </Link>
      </div>
    )
  }

  if (soloLecturaOnly || !estaEnPrueba(suscripcion)) {
    return null
  }

  const dias = diasRestantesPrueba(suscripcion)

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
    >
      <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1">
        {dias === 0
          ? 'Hoy es el último día de tu prueba.'
          : `Te ${dias === 1 ? 'queda' : 'quedan'} ${dias} ${dias === 1 ? 'día' : 'días'} de prueba.`}
      </p>
      <Link
        to="/configuracion"
        className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
      >
        Activar plan
      </Link>
    </div>
  )
}

export default SuscripcionBanner
