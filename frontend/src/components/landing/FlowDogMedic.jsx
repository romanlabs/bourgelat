import { useVisible } from "./useVisible"

// Perro veterinario (bata + estetoscopio) que se asoma desde el borde izquierdo
// en la transición flujo → planes. Solo desktop; respeta reduced-motion.
export default function FlowDogMedic() {
  const { ref, visible } = useVisible(0.2, { toggle: true, rootMargin: '0px 0px -10% 0px' })
  return (
    <img
      ref={ref}
      src="/images/perro-medico-lateral.webp"
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`flow-dog-medic${visible ? ' is-visible' : ''}`}
    />
  )
}
