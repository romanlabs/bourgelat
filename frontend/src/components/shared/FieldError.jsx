import { cn } from '@/lib/utils'

/**
 * Inline validation error displayed below a form field.
 * Pass `message` from react-hook-form's `errors.field.message`.
 */
export function FieldError({ message, className }) {
  if (!message) return null
  return (
    <p className={cn('mt-1 text-xs text-red-500', className)} role="alert">
      {message}
    </p>
  )
}
