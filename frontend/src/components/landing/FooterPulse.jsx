// Latido decorativo: un trazo continuo (línea → figura → línea) recorrido por
// una luz, eco de la firma ECG del hero. Reutilizable por forma y orientación.
// `pathLength="1000"` normaliza la longitud para que el barrido cierre exacto.

// viewBox 1200×40: la línea cruza todo el ancho y el corazón queda pequeño y
// centrado (en x=600), sin agrandarse al estirar el divisor.
const SHAPES = {
  // Corazón simétrico con la punta apoyada en la línea (600,20).
  heart:
    'M0 20 H600 ' +
    'C597 16 587 14 587 9 C587 4 594 2 599 6 C599 9 600 8 600 10 ' +
    'C600 8 601 9 601 6 C606 2 613 4 613 9 C613 14 603 16 600 20 ' +
    'H1200',
  // Pulso ECG (signo vital), simétrico alrededor del centro.
  pulse:
    'M0 20 H576 l8 0 l5 -7 l5 18 l6 -30 l6 30 l5 -18 l5 7 l8 0 H1200',
}

export default function FooterPulse({ shape = 'heart', className = '', duration = 4.2 }) {
  const d = SHAPES[shape] || SHAPES.heart
  return (
    <div
      className={`footer-pulse ${className}`}
      aria-hidden="true"
      style={{ '--fp-dur': `${duration}s` }}
    >
      <svg viewBox="0 0 1200 40" preserveAspectRatio="xMidYMid meet">
        <path className="footer-pulse__base" d={d} pathLength="1000" />
        <path className="footer-pulse__sweep" d={d} pathLength="1000" />
      </svg>
    </div>
  )
}
