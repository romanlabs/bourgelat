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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <TriangleAlert className="h-5 w-5 text-red-500" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {children ? <div className="py-2 text-sm text-slate-600">{children}</div> : null}

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={variant}
            size="sm"
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
