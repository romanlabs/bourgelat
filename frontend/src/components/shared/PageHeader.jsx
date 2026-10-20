import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Cabecera estándar de página.
 *
 * Props:
 *   title        — texto principal (h1)
 *   description  — subtítulo opcional
 *   actions      — ReactNode: botones/CTAs alineados a la derecha
 *   badge        — ReactNode: StatusBadge u otro elemento inline junto al título
 *   back         — { label, to }: enlace de retroceso sobre el título
 *   className    — clases adicionales para el wrapper
 *
 * Uso:
 *   <PageHeader
 *     title="Facturas"
 *     description="Historial de facturación electrónica"
 *     badge={<StatusBadge variant="activa" />}
 *     actions={<Button><Plus /> Nueva factura</Button>}
 *     back={{ label: 'Configuración', to: '/configuracion' }}
 *   />
 */
export function PageHeader({ title, description, actions, badge, back, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {back && (
          <Link
            to={back.to}
            className="mb-2 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
            {back.label}
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-foreground">{title}</h1>
          {badge}
        </div>

        {description && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
