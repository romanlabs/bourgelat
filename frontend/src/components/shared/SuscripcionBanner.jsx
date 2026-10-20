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
        className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-soft px-4 py-3.5 text-sm text-warning sm:px-5"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 font-medium">
          Tu suscripción venció. Puedes consultar tu información y descargar tus documentos, pero no
          crear ni editar registros.
        </p>
        <Link
          to="/plan"
          className="inline-flex h-9 items-center rounded-lg bg-card px-3.5 font-semibold text-warning transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      className="flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3.5 text-sm text-foreground sm:px-5"
    >
      <Clock className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {dias === 0
          ? 'Hoy es el último día de tu prueba.'
          : `Te ${dias === 1 ? 'queda' : 'quedan'} ${dias} ${dias === 1 ? 'día' : 'días'} de prueba.`}
      </p>
      <Link
        to="/plan"
        className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Activar plan
      </Link>
    </div>
  )
}

export default SuscripcionBanner
