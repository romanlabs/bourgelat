import { Dialog } from 'radix-ui'
import { motion as Motion, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Hoja que sube desde abajo (bottom sheet). Se cierra arrastrando la manija
 * hacia abajo, tocando fuera o con la X. Pensada para celular; en escritorio
 * se ve como un diálogo centrado (sm en adelante).
 *
 * <HojaInferior abierta={a} onCambiar={setA} titulo="Cobrar" pie={<Boton/>}>…</HojaInferior>
 */
export default function HojaInferior({ abierta, onCambiar, titulo, descripcion, pie, children, className }) {
  const controles = useDragControls()

  return (
    <Dialog.Root open={abierta} onOpenChange={onCambiar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/45 data-[state=open]:[animation:admin-drawer-overlay-in_200ms_ease-out] data-[state=closed]:[animation:admin-drawer-overlay-out_150ms_ease-in]" />
        <Dialog.Content asChild aria-describedby={descripcion ? undefined : undefined}>
          <Motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            drag="y"
            dragListener={false}
            dragControls={controles}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onCambiar?.(false)
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-card text-card-foreground shadow-modal outline-none',
              'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
              className
            )}
          >
            <div
              onPointerDown={(event) => controles.start(event)}
              className="flex shrink-0 cursor-grab touch-none flex-col gap-3 px-5 pb-3 pt-2.5 active:cursor-grabbing sm:pt-5"
            >
              <span className="mx-auto h-1.5 w-10 rounded-full bg-border sm:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Dialog.Title className="text-xl font-semibold tracking-[-0.02em] text-foreground">{titulo}</Dialog.Title>
                  {descripcion ? <Dialog.Description className="mt-1 text-sm text-muted-foreground">{descripcion}</Dialog.Description> : null}
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {pie ? (
              <div className="shrink-0 border-t border-border px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{pie}</div>
            ) : (
              <div className="pb-[env(safe-area-inset-bottom)]" />
            )}
          </Motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
