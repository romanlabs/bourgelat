import { cn } from '@/lib/utils'

// Ilustraciones de los estados de pantalla. Van en SVG dentro del código y no como
// video o imagen a propósito: una pantalla de error tiene que verse incluso cuando
// el navegador no puede descargar nada más.
//
// La animación vive en index.css y se apaga con prefers-reduced-motion.

const PULSO = 'M8 84h104l16-44 26 92 18-48h148'

const ESCENAS = {
  // El pulso sigue latiendo: la pantalla está en revisión o poniéndose al día.
  pulso: (
    <>
      <path className="estado-pulso-base" d={PULSO} />
      <path className="estado-pulso" pathLength="100" d={PULSO} />
    </>
  ),
  // El pulso se vuelve un rastro que no llega a ninguna parte: la página no existe.
  rastro: (
    <>
      <path className="estado-pulso-fijo" d="M8 84h84l16-44 26 92 14-44h20" />
      <path className="estado-rastro" d="M176 88c30 0 52 0 76-2" />
      <path className="estado-pulso-fijo" d="M276 58c2-16 28-15 28 2 0 13-14 13-14 26" />
      <circle className="estado-acento-lleno" cx="290" cy="104" r="4" />
    </>
  ),
  // Pulso cortado que busca la señal: sin internet.
  conexion: (
    <>
      <path className="estado-pulso-fijo" d="M8 84h84l16-44 26 92 14-44h12" />
      <path className="estado-pulso-fijo" d="M312 84h-92" />
      <path className="estado-pulso-fijo estado-chispa" d="M178 68l10 16-10 16M204 68l-10 16 10 16" />
    </>
  ),
}

/**
 * @param {{ escena: 'pulso' | 'rastro' | 'conexion', className?: string }} props
 */
export function IlustracionEstado({ escena, className }) {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="5"
      stroke="currentColor"
      aria-hidden="true"
      className={cn('estado-escena block h-auto w-full', className)}
    >
      {ESCENAS[escena]}
    </svg>
  )
}

// Pantalla completa mientras se descarga un módulo o se abre la sesión. Aparece con
// un leve retraso: si la carga es rápida, no alcanza a parpadear.
export function PantallaCarga({ etiqueta }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PulsoCarga etiqueta={etiqueta} className="estado-aparece-tarde" />
    </div>
  )
}

// Línea de pulso que se dibuja una y otra vez: la carga de la marca.
export function PulsoCarga({ className, etiqueta = 'Cargando' }) {
  return (
    <div role="status" aria-label={etiqueta} className={cn('w-32', className)}>
      <IlustracionEstado escena="pulso" />
    </div>
  )
}
