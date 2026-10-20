import * as React from 'react'
import { Dialog } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DialogRoot = Dialog.Root
const DialogTrigger = Dialog.Trigger
const DialogPortal = Dialog.Portal
const DialogClose = Dialog.Close

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-foreground/50 dark:bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 text-card-foreground shadow-modal duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none">
        <X className="h-[18px] w-[18px]" />
        <span className="sr-only">Cerrar</span>
      </Dialog.Close>
    </Dialog.Content>
  </DialogPortal>
))
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 pr-10 text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-[15px] leading-relaxed text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

export {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
