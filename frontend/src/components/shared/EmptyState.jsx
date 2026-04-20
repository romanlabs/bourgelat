import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const wrapperVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      size: {
        sm: 'gap-3 px-4 py-8',
        md: 'gap-4 px-6 py-12',
        lg: 'gap-5 px-8 py-16',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

const iconWrapperVariants = cva(
  'flex items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-10 w-10 [&_svg]:h-5 [&_svg]:w-5',
        md: 'h-14 w-14 [&_svg]:h-7 [&_svg]:w-7',
        lg: 'h-18 w-18 [&_svg]:h-9 [&_svg]:w-9',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

/**
 * Estado vacío reutilizable para tablas, módulos y secciones.
 *
 * Reemplaza el patrón manual de EmptyModuleState en dashboardComponents.
 *
 * Props:
 *   icon        — componente de ícono Lucide (se pasa como elemento, ej: <Boxes />)
 *   title       — texto principal
 *   description — texto secundario / instrucción
 *   action      — ReactNode: botón CTA
 *   size        — 'sm' | 'md' | 'lg' (default: 'md')
 *   bordered    — muestra borde punteado alrededor (útil dentro de tablas)
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
export function EmptyState({ icon, title, description, action, size = 'md', bordered = false, className }) {
  return (
    <div
      className={cn(
        wrapperVariants({ size }),
        bordered && 'rounded-xl border border-dashed border-border bg-muted/40',
        className
      )}
    >
      {icon && (
        <div className={cn(iconWrapperVariants({ size }))}>
          {icon}
        </div>
      )}

      <div className="max-w-xs space-y-1.5">
        <p className="text-h4 text-foreground">{title}</p>
        {description && (
          <p className="text-small text-muted-foreground">{description}</p>
        )}
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
