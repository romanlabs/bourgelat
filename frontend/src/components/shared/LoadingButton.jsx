import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Button with integrated spinner for async actions.
 *
 * @param {{
 *   loading?: boolean,
 *   loadingLabel?: string,
 *   children: React.ReactNode,
 *   className?: string,
 * } & React.ComponentProps<typeof Button>} props
 */
export function LoadingButton({ loading = false, loadingLabel, children, className, disabled, ...props }) {
  return (
    <Button
      className={cn(className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  )
}
