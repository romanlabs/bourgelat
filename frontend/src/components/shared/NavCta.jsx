import { cva } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navCtaVariants = cva(
  'group inline-flex items-center gap-3 rounded-full border bg-card text-sm font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        primary: 'border-border hover:border-primary/30 hover:shadow-sm',
        destructive:
          'border-destructive/20 hover:border-destructive/40 hover:shadow-sm dark:border-red-800/60 dark:hover:border-red-600',
      },
      variant: {
        solid: '',
        outline: 'bg-transparent',
      },
      size: {
        sm: 'py-1.5 pl-1.5 pr-4 text-xs',
        md: 'py-2 pl-2 pr-5 text-sm',
        lg: 'py-2.5 pl-2.5 pr-6 text-base',
      },
    },
    defaultVariants: { tone: 'primary', variant: 'solid', size: 'md' },
  }
)

const navCtaIconVariants = cva(
  'flex shrink-0 items-center justify-center rounded-full transition-colors [&_svg]:h-4 [&_svg]:w-4',
  {
    variants: {
      tone: {
        primary: 'bg-primary/10 text-primary group-hover:bg-primary/15',
        destructive:
          'bg-destructive/10 text-destructive group-hover:bg-destructive/15 dark:bg-red-500/15 dark:text-red-300 dark:group-hover:bg-red-500/25',
      },
      size: {
        sm: 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5',
        md: 'h-8 w-8',
        lg: 'h-9 w-9',
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
        destructive: 'text-destructive dark:text-red-300',
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
 * Pill de navegación entre módulos: círculo con ícono a la izquierda + texto.
 * Un solo acento de color (tone) en toda la app — vive solo en el círculo,
 * nunca como fondo sólido del pill, para no competir con los botones de
 * acción real (Button).
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
