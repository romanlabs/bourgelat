import { useVisible } from "./useVisible"

export default function DeviceMockup() {
  const { ref, visible } = useVisible(0.15, { toggle: true, rootMargin: '0px 0px -20% 0px' })
  return (
    <div ref={ref} style={{ marginLeft: '-6%', mixBlendMode: 'multiply' }}>
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0px)' : 'translateX(-110%)',
        transition: visible
          ? 'opacity 700ms ease-out 100ms, transform 900ms cubic-bezier(0.22,1,0.36,1) 100ms'
          : 'opacity 500ms ease-in, transform 600ms cubic-bezier(0.55,0,1,0.45)',
        position: 'relative',
        filter: 'drop-shadow(0 40px 80px rgba(43,32,24,0.22)) drop-shadow(0 12px 32px rgba(43,32,24,0.14))',
      }}
    >
      {/* Hand + tablet photo (transparent PNG from remove.bg) */}
      <img
        src="/images/mano-tablet.webp"
        alt="Profesional sosteniendo tablet con Bourgelat"
        style={{ width: '100%', display: 'block', position: 'relative', zIndex: 1 }}
        loading="lazy"
      />
      {/* Dashboard screenshot overlaid on the tablet screen.
          Values calibrated to the tablet's position and ~9° CW tilt in mano-tablet.png.
          Adjust top/left/width/height if the image is replaced. */}
      <div style={{
        position: 'absolute',
        top: '5.1%',
        left: '38.8%',
        width: '53.411%',
        height: '67.56%',
        transform: 'perspective(987px) rotateX(5.7deg) rotate(0.29deg)',
        transformOrigin: 'center center',
        overflow: 'hidden',
        borderRadius: 1.1,
        zIndex: 2,
      }}>
        <img
          src="/images/bourgelat-pacientes.webp"
          alt="Módulo de pacientes en Bourgelat"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top left',
            display: 'block',
            filter: 'brightness(0.97)',
          }}
          loading="lazy"
        />
        {/* Screen vignette — simula el cristal de la pantalla */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, transparent 65%, rgba(0,0,0,0.04) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Sombra sutil en el borde izquierdo del mockup */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 35%)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
    </div>
  )
}
