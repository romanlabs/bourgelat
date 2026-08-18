import * as React from 'react'
import { Tooltip } from 'radix-ui'
import { cn } from '@/lib/utils'

const TooltipProvider = Tooltip.Provider
const TooltipRoot = Tooltip.Root
const TooltipTrigger = Tooltip.Trigger

const TooltipContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
  <Tooltip.Portal>
    <Tooltip.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-full bg-[#1f1f1f] px-3.5 py-1.5 text-xs font-medium text-white shadow-md data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
        className
      )}
      {...props}
    />
  </Tooltip.Portal>
))
TooltipContent.displayName = 'TooltipContent'

/** Envoltura simple: <SimpleTooltip label="..."><button/></SimpleTooltip> */
function SimpleTooltip({ label, children, delayDuration = 500 }) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, SimpleTooltip }
