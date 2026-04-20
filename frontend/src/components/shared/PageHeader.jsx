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
            className="mb-2 inline-flex items-center gap-1 text-small text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {back.label}
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="heading-1 text-foreground">{title}</h1>
          {badge}
        </div>

        {description && (
          <p className="mt-1.5 max-w-2xl text-small text-muted-foreground">
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
