import { useVisible } from "./useVisible"

// Personaje decorativo: el perro "veterinario" se asoma desde el borde derecho
// con una ficha en la pata, en sintonía con las fichas clínicas del carrusel.
// Solo en pantallas grandes; respeta prefers-reduced-motion (ver index.css).
export default function FlowDog() {
  const { ref, visible } = useVisible(0.25, { toggle: true, rootMargin: '0px 0px -12% 0px' })
  return (
    <img
      ref={ref}
      src="/images/perro-gafas-flujo.webp"
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`flow-dog${visible ? ' is-visible' : ''}`}
    />
  )
}
