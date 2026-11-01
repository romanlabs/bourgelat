import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, X } from 'lucide-react'
import HojaInferior from '@/components/movil/HojaInferior'
import { useEsCelular } from '@/lib/useEsCelular'

/**
 * Panel lateral de Recepción. Un solo contenedor para los tres flujos que
 * antes ocupaban columnas fijas o no existian: programar cita, ingreso
 * directo y detalle de un paciente de la sala de espera.
 *
 * Mismo patron que features/pacientes/TutorDrawer.jsx (portal + overlay +
 * Escape), extraido aqui como componente generico para no repetirlo tres veces.
 */
export function RecepcionDrawer({ open, onClose, title, subtitle, width = 'sm:w-[460px]', children, footer, hoja = false }) {
  const esCelular = useEsCelular()

  useEffect(() => {
    if (!open) return
    const handler = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  // Contenido corto (detalle): en celular sube como hoja y se cierra arrastrando.
  // Los formularios largos siguen a pantalla completa porque abren otros paneles
  // encima (crear tutor) que una hoja modal bloquearía.
  if (hoja && esCelular) {
    return (
      <HojaInferior
        abierta={open}
        onCambiar={(valor) => {
          if (!valor) onClose()
        }}
        titulo={title}
        descripcion={subtitle}
        pie={footer}
      >
        {open ? children : null}
      </HojaInferior>
    )
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:rounded-l-2xl ${width} ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Celular: cabecera compacta (volver + título); el subtítulo se oculta
            para dejar sitio al formulario. Desde sm: la cabecera de siempre. */}
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1 sm:items-start sm:gap-3 sm:border-b-0 sm:px-6 sm:pb-2 sm:pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Volver"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-foreground transition active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-[22px]">{title}</h2>
            {subtitle ? <p className="mt-1.5 hidden text-[15px] leading-6 text-muted-foreground sm:block">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{open ? children : null}</div>

        {footer ? (
          <div className="border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">{footer}</div>
        ) : null}
      </div>
    </>,
    document.body
  )
}
