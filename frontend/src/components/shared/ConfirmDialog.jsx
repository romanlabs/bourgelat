import { Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] bg-danger-soft">
            <TriangleAlert className="h-6 w-6 text-danger" />
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
