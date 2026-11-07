import Captura from './Captura'
import { ALUMINIO, LENTE, MARCO, SOMBRA, SOMBRA_BOTON } from './materiales'
import Vidrio from './Vidrio'

// Una captura real dentro de una tablet dibujada con CSS (sin marca ni foto de
// un aparato concreto).
function Boton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute rounded-full ${className}`}
      style={{ background: ALUMINIO, boxShadow: SOMBRA_BOTON }}
    />
  )
}

export default function Tablet({ src, alt, prioridad = false, className = '' }) {
  return (
    <div className={`relative isolate ${className}`}>
      {/* Botón de encendido arriba y volumen al costado, pegados al canto. */}
      <Boton className="-top-[2px] right-[14%] h-[3px] w-[8%]" />
      <Boton className="-right-[2px] top-[10%] h-[7%] w-[3px]" />
      <Boton className="-right-[2px] top-[19%] h-[7%] w-[3px]" />

      {/* Canto de aluminio */}
      <div
        className="relative rounded-[1.5rem] p-[2px] sm:rounded-[2.4rem] sm:p-[3px]"
        style={{ background: ALUMINIO, boxShadow: SOMBRA }}
      >
        {/* Marco negro */}
        <div
          className="relative rounded-[calc(1.5rem-2px)] p-3 sm:rounded-[calc(2.4rem-3px)] sm:p-[1.35rem]"
          style={{ background: MARCO, boxShadow: 'inset 0 0 0 1px hsl(0 0% 100% / 0.06)' }}
        >
          {/* Cámara */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full sm:top-[8px] sm:h-[7px] sm:w-[7px]"
            style={{ background: LENTE, boxShadow: '0 0 0 1px hsl(220 6% 14%)' }}
          />
          {/* Pantalla con el vidrio encima */}
          <div className="relative overflow-hidden rounded-[0.4rem] sm:rounded-[0.6rem]" style={{ boxShadow: '0 0 0 1px hsl(0 0% 0% / 0.8)' }}>
            <Captura src={src} alt={alt} prioridad={prioridad} entera />
            <Vidrio />
          </div>
        </div>
      </div>
    </div>
  )
}
