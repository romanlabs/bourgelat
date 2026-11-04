import { CircleHelp, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   title: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   variant?: 'default' | 'destructive',
 *   loading?: boolean,
 *   onConfirm: () => void,
 *   children?: React.ReactNode,
 * }} props
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'destructive',
  loading = false,
  onConfirm,
  children,
}) {
  const destructiva = variant === 'destructive'
  // Mientras se guarda no se cierra: el resultado quedaría sin nadie que lo vea.
  const alCambiar = (abierto) => {
    if (!abierto && loading) return
    onOpenChange(abierto)
  }

  return (
    <DialogRoot open={open} onOpenChange={alCambiar}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          {/* El triángulo rojo es solo para lo que no se deshace fácil. */}
          <div
            className={cn(
              'mb-2 flex h-12 w-12 items-center justify-center rounded-[14px]',
              destructiva ? 'bg-danger-soft' : 'bg-success-soft',
            )}
          >
            {destructiva ? (
              <TriangleAlert className="h-6 w-6 text-danger" />
            ) : (
              <CircleHelp className="h-6 w-6 text-success" />
            )}
          </div>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {children ? <div className="pt-4 text-[15px] leading-relaxed text-muted-foreground">{children}</div> : null}

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="secondary" size="lg" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={variant}
            size="lg"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
