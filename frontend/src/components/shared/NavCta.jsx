import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navCtaVariants = cva(
  'group inline-flex items-center gap-2 rounded-lg font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        primary: 'bg-secondary text-secondary-foreground hover:brightness-95',
        destructive: 'bg-danger-soft text-danger hover:brightness-95',
      },
      variant: {
        solid: '',
        outline: 'bg-transparent hover:bg-secondary',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: { tone: 'primary', variant: 'solid', size: 'md' },
  }
)

const navCtaIconVariants = cva(
  'flex shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4',
  {
    variants: {
      tone: {
        primary: 'text-primary',
        destructive: 'text-danger',
      },
      size: {
        sm: '[&_svg]:h-3.5 [&_svg]:w-3.5',
        md: '',
        lg: '',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md' },
  }
)

const navCtaLinkVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm font-semibold underline-offset-4 decoration-transparent outline-none transition-colors select-none hover:decoration-current focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        primary: 'text-primary',
        destructive: 'text-danger',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md' },
  }
)

/**
 * Botón secundario de navegación entre módulos: fondo bruma, ícono en el
 * color del tono y texto. Nunca relleno sólido, para no competir con los
 * botones de acción real (Button).
 *
 * Props:
 *   to       — ruta interna (usa react-router Link); se ignora si asChild=true
 *   asChild  — envuelve un elemento propio (ej. <a> externo) en vez de Link/button
 *   icon     — componente de ícono Lucide, ej: icon={CalendarClock}
 *   tone     — 'primary' (default) | 'destructive'
 *   variant  — 'solid' (default) | 'outline'
 *   size     — 'sm' | 'md' (default) | 'lg'
 *
 * Uso:
 *   <NavCta to="/agenda" icon={CalendarClock}>Abrir agenda completa</NavCta>
 */
export function NavCta({
  to,
  asChild = false,
  icon: Icon,
  tone = 'primary',
  variant = 'solid',
  size = 'md',
  children,
  className,
  ...props
}) {
  const Comp = asChild ? Slot.Root : to ? Link : 'button'
  const linkProps = to && !asChild ? { to } : {}

  return (
    <Comp
      data-slot="nav-cta"
      className={cn(navCtaVariants({ tone, variant, size }), className)}
      {...linkProps}
      {...props}
    >
      {Icon && (
        <span className={cn(navCtaIconVariants({ tone, size }))}>
          <Icon />
        </span>
      )}
      <span>{children}</span>
    </Comp>
  )
}

/**
 * Variante de texto de NavCta, para tablas, filas y paneles compactos:
 * sin pill ni fondo, ícono opcional más pequeño, subrayado que aparece al hover.
 *
 * Uso:
 *   <NavCtaLink to="/planes">Ver planes y renovación</NavCtaLink>
 *   <NavCtaLink to="/agenda" icon={ArrowRight} tone="destructive">Documentar urgencias</NavCtaLink>
 */
export function NavCtaLink({
  to,
  asChild = false,
  icon: Icon,
  tone = 'primary',
  size = 'md',
  children,
  className,
  ...props
}) {
  const Comp = asChild ? Slot.Root : to ? Link : 'button'
  const linkProps = to && !asChild ? { to } : {}

  return (
    <Comp
      data-slot="nav-cta-link"
      className={cn(navCtaLinkVariants({ tone, size }), className)}
      {...linkProps}
      {...props}
    >
      {children}
      {Icon && <Icon />}
    </Comp>
  )
}
