import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import HojaInferior from '@/components/movil/HojaInferior'

const TONO = {
  primary: 'bg-primary text-primary-foreground',
  danger: 'bg-danger-soft text-danger',
  neutro: 'bg-secondary text-secondary-foreground',
}

const CLASE_OPCION =
  'flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-base font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Opciones de una cita al mantenerla presionada en el celular (agenda y
 * recepción). Cada opción es un botón (`onClick`), un enlace interno (`to`)
 * o externo (`href`, p. ej. tel:).
 *
 * opciones: [{ key, label, icon, tono, onClick?, to?, href?, disabled? }]
 */
export function HojaOpcionesCita({ abierta, onCambiar, titulo, descripcion, opciones = [] }) {
  return (
    <HojaInferior abierta={abierta} onCambiar={onCambiar} titulo={titulo} descripcion={descripcion}>
      <ul className="flex flex-col gap-2 pb-2">
        {opciones.map((opcion) => {
          const Icono = opcion.icon
          const contenido = (
            <>
              {Icono ? <Icono className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
              <span className="min-w-0 flex-1 truncate">{opcion.label}</span>
            </>
          )
          const clase = cn(CLASE_OPCION, TONO[opcion.tono] || TONO.neutro)
          return (
            <li key={opcion.key}>
              {opcion.to ? (
                <Link to={opcion.to} className={clase} onClick={() => onCambiar(false)}>
                  {contenido}
                </Link>
              ) : opcion.href ? (
                <a href={opcion.href} className={clase} onClick={() => onCambiar(false)}>
                  {contenido}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={opcion.disabled}
                  className={clase}
                  onClick={() => {
                    onCambiar(false)
                    opcion.onClick?.()
                  }}
                >
                  {contenido}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </HojaInferior>
  )
}
