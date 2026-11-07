import { useEffect, useState } from "react"
import { motion as Motion, useReducedMotion } from "motion/react"
import { WHATSAPP } from "./contenido"

// Botón flotante de soporte por WhatsApp, fijo abajo a la derecha. Aparece un
// segundo después de cargar (también sobre el héroe: en celular queda sobre la
// captura, lejos de los botones) y se oculta desde el cierre hasta el final,
// que ya tienen sus propios botones. Entra abierto con «Escríbenos», a los
// pocos segundos se recoge solo en la bolita (en computador se abre de nuevo
// al pasar el mouse) y un brillo lo cruza solo cada pocos segundos, sin
// depender del scroll. Sin brillo ni latido con movimiento reducido.
// Solo vive en la landing, que siempre tiene #cierre.
const WHATSAPP_NUMBER = WHATSAPP
const WHATSAPP_MESSAGE = 'Hola, quiero saber más sobre Bourgelat.'
const RETRASO_MS = 1000
const ABIERTO_MS = 3500

const BRILLO =
  'linear-gradient(105deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)'

export default function WhatsAppFab() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
  const [listo, setListo] = useState(false)
  const [abierto, setAbierto] = useState(true)
  const [enCierre, setEnCierre] = useState(false)
  const reducido = useReducedMotion()

  useEffect(() => {
    const temporizador = setTimeout(() => setListo(true), RETRASO_MS)
    const recoger = setTimeout(() => setAbierto(false), RETRASO_MS + ABIERTO_MS)
    const contacto = document.getElementById('cierre')
    // Desde que el cierre asoma y durante todo el footer (queda por encima).
    const contactoObserver = contacto
      ? new IntersectionObserver(([entry]) =>
          setEnCierre(entry.isIntersecting || entry.boundingClientRect.top < 0)
        )
      : null
    contactoObserver?.observe(contacto)
    return () => {
      clearTimeout(temporizador)
      clearTimeout(recoger)
      contactoObserver?.disconnect()
    }
  }, [])

  const oculto = !listo || enCierre

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Escríbenos por WhatsApp"
      aria-hidden={oculto || undefined}
      tabIndex={oculto ? -1 : undefined}
      className={`group fixed right-4 z-50 flex h-14 min-w-14 items-center justify-center rounded-full bg-success text-primary-foreground no-underline shadow-xl transition-[opacity,transform,padding] duration-500 ease-out hover:scale-105 sm:right-6 sm:h-[3.75rem] sm:min-w-[3.75rem] ${
        abierto ? 'pl-4 pr-5 sm:pl-5 sm:pr-6' : 'px-0 hover:pl-4 hover:pr-5 focus-visible:pl-4 focus-visible:pr-5 sm:hover:pl-5 sm:hover:pr-6 sm:focus-visible:pl-5 sm:focus-visible:pr-6'
      } ${oculto ? 'pointer-events-none translate-y-3 opacity-0' : 'opacity-100'}`}
      // El área segura del iPhone (barra de inicio) se suma al margen inferior.
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
    >
      {/* Un latido al aparecer, para que se note. */}
      {!oculto && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-success opacity-0 motion-safe:animate-[ping_1.4s_ease-out_2]"
        />
      )}
      <svg
        viewBox="0 0 24 24"
        className="relative h-7 w-7"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.148-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
      </svg>
      {/* El texto se abre y se cierra animando el ancho de su columna. */}
      <span
        className={`relative grid transition-[grid-template-columns] duration-500 ease-out ${
          abierto ? 'grid-cols-[1fr]' : 'grid-cols-[0fr] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]'
        }`}
      >
        <span className="overflow-hidden whitespace-nowrap text-base font-semibold">
          <span className="pl-2.5">Escríbenos</span>
        </span>
      </span>
      {/* Brillo que cruza el botón solo, cada pocos segundos. */}
      {!reducido && !oculto && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <Motion.span
            className="absolute inset-y-0 left-0 w-full"
            style={{ background: BRILLO }}
            initial={{ x: '-110%' }}
            animate={{ x: '110%' }}
            transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3, delay: 0.6 }}
          />
        </span>
      )}
    </a>
  )
}
