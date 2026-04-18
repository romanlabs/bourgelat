import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const sectionCardVariants = cva(
  'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
  {
    variants: {
      padding: {
        none: '',
        sm:   '[&>[data-slot=body]]:p-4',
        md:   '[&>[data-slot=body]]:p-5',
        lg:   '[&>[data-slot=body]]:p-6',
      },
    },
    defaultVariants: { padding: 'md' },
  }
)

/**
 * Contenedor base para paneles, secciones y formularios.
 *
 * Reemplaza el patrón manual:
 *   rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]
 *
 * Uso:
 *   <SectionCard title="Productos" action={<Button>Agregar</Button>}>
 *     contenido
 *   </SectionCard>
 */
export function SectionCard({ title, description, action, children, padding, className, ...props }) {
  const hasHeader = title || description || action

  return (
    <section className={cn(sectionCardVariants({ padding }), className)} {...props}>
      {hasHeader && (
        <div
          data-slot="header"
          className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            {title && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {title}
              </p>
            )}
            {description && (
              <p className="mt-1 text-small text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div data-slot="body">{children}</div>
    </section>
  )
}
