// Versión de celular de los listados de caja: las tablas quedan para escritorio
// (DataTable) y aquí cada fila es una tarjeta. Mismo título, acción y filtros.
export default function PanelListaMovil({
  title,
  subtitle,
  action,
  filters,
  collapsed = false,
  vacio = false,
  emptyTitle,
  emptyBody,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-card lg:hidden">
      <div className={`flex flex-col gap-3 px-4 pb-4 pt-5 ${collapsed ? '' : 'border-b border-border'}`}>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-card-foreground">{title}</h2>
          {!collapsed && subtitle ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
        {!collapsed && filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
      </div>

      {collapsed ? null : vacio ? (
        <div className="p-4">
          <div className="rounded-xl bg-muted px-4 py-5">
            <p className="text-sm font-semibold text-card-foreground">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyBody}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  )
}
