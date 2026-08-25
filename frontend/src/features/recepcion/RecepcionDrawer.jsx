import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Panel lateral de Recepción. Un solo contenedor para los tres flujos que
 * antes ocupaban columnas fijas o no existian: programar cita, ingreso
 * directo y detalle de un paciente de la sala de espera.
 *
 * Mismo patron que features/pacientes/TutorDrawer.jsx (portal + overlay +
 * Escape), extraido aqui como componente generico para no repetirlo tres veces.
 */
export function RecepcionDrawer({ open, onClose, title, subtitle, width = 'sm:w-[460px]', children, footer }) {
  useEffect(() => {
    if (!open) return
    const handler = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

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
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:border-l sm:border-border ${width} ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{open ? children : null}</div>

        {footer ? <div className="border-t border-border bg-muted/40 px-5 py-4">{footer}</div> : null}
      </div>
    </>,
    document.body
  )
}
