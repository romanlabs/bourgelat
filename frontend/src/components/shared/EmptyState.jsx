import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const wrapperVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      size: {
        sm: 'gap-3 px-5 py-8',
        md: 'gap-4 px-6 py-12',
        lg: 'gap-5 px-8 py-16',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

const iconWrapperVariants = cva(
  'flex shrink-0 items-center justify-center',
  {
    variants: {
      size: {
        sm: 'h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5',
        md: 'h-14 w-14 rounded-2xl [&_svg]:h-7 [&_svg]:w-7',
        lg: 'h-[72px] w-[72px] rounded-[20px] [&_svg]:h-9 [&_svg]:w-9',
      },
      variant: {
        default: 'bg-accent text-primary',
        warm: 'bg-brand-muted text-brand-foreground',
        primary: 'bg-primary/10 text-primary',
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  }
)

/**
 * Estado vacío reutilizable para tablas, módulos y secciones.
 *
 * Props:
 *   icon        — componente de ícono Lucide (se pasa como elemento, ej: <Boxes />)
 *   title       — texto principal
 *   description — texto secundario / instrucción
 *   action      — ReactNode: botón CTA
 *   size        — 'sm' | 'md' | 'lg' (default: 'md')
 *   bordered    — enmarca el estado en una superficie suave (útil dentro de
 *                 tarjetas y tablas). Se conserva el nombre por compatibilidad;
 *                 ya no dibuja borde.
 *   className
 *
 * Uso básico:
 *   <EmptyState
 *     icon={<PackagePlus />}
 *     title="Sin productos"
 *     description="Agrega el primer producto al inventario."
 *     action={<Button>Agregar producto</Button>}
 *   />
 *
 * Dentro de tabla (bordado):
 *   <EmptyState icon={<Search />} title="Sin resultados" bordered />
 */
export function EmptyState({ icon, title, description, action, size = 'md', variant = 'default', bordered = false, className }) {
  return (
    <div
      className={cn(
        wrapperVariants({ size }),
        bordered && 'rounded-xl bg-muted',
        className
      )}
    >
      {icon && (
        <div className={cn(iconWrapperVariants({ size, variant }))}>
          {icon}
        </div>
      )}

      <div className="max-w-sm space-y-1.5">
        <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</p>
        {description && (
          <p className="text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>

      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  )
}
