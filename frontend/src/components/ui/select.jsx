import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selector desplegable con el mismo lenguaje visual que el selector de vista
 * de la agenda: panel redondeado, items cómodos y palomita en el elegido.
 *
 * Dos variantes de disparador:
 *  - "pill"  → píldora redonda, para barras de filtros y toolbars
 *  - "field" → rectangular a lo ancho, para campos de formulario
 */
// Radix no admite "" como valor de item; los campos de formulario que usan la
// cadena vacia como "sin elegir" se traducen a este centinela solo de ida y
// vuelta, para que el estado del formulario (y su validacion Zod) no cambie.
const EMPTY = '__vacio__'
const toRadix = (value) => (value === '' || value == null ? EMPTY : value)
const fromRadix = (value) => (value === EMPTY ? '' : value)

const triggerVariants = {
  pill: 'h-10 rounded-full border border-border bg-card pl-5 pr-4 shadow-sm hover:bg-muted data-[state=open]:bg-muted',
  field: 'h-10 w-full rounded-md border border-border bg-card px-3 focus:border-primary',
}

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position="popper"
      sideOffset={6}
      className={cn(
        'z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-card py-2 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-3 px-5 py-2.5 text-sm text-foreground outline-none transition data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

/**
 * Envoltura de uso directo:
 *   <Select value={x} onValueChange={setX} options={[{ value, label }]} />
 *
 * `options` acepta objetos {value, label} o strings sueltos. Para casos con
 * grupos o contenido a medida, usar las piezas exportadas abajo.
 */
function Select({
  value,
  onValueChange,
  options = [],
  placeholder = 'Selecciona…',
  variant = 'pill',
  className,
  contentClassName,
  disabled,
  name,
  id,
  'aria-label': ariaLabel,
  children,
}) {
  return (
    <SelectPrimitive.Root
      value={toRadix(value)}
      onValueChange={(next) => onValueChange?.(fromRadix(next))}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'flex items-center justify-between gap-2 text-sm font-normal text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
          triggerVariants[variant],
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectContent className={contentClassName}>
        {children ??
          options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value
            const optLabel = typeof opt === 'string' ? opt : opt.label
            return (
              <SelectItem key={optValue || EMPTY} value={toRadix(optValue)} disabled={opt?.disabled}>
                {optLabel}
              </SelectItem>
            )
          })}
      </SelectContent>
    </SelectPrimitive.Root>
  )
}

const SelectRoot = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectSeparator = SelectPrimitive.Separator

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground',
      className
    )}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

export { Select, SelectRoot, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator }
