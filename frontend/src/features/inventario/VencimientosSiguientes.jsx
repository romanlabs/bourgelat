import { useQuery } from '@tanstack/react-query'
import { obtenerVencimientosSiguientes } from './facturaCompraApi'

export default function VencimientosSiguientes({ productoId, insumoClinicoId, onUsar }) {
  const id = productoId || insumoClinicoId
  const { data } = useQuery({
    queryKey: ['vencimientos-siguientes', id],
    queryFn: () => obtenerVencimientosSiguientes({ productoId, insumoClinicoId }),
    enabled: Boolean(id),
    // Roles sin acceso a compras reciben 403: simplemente no se muestra nada.
    retry: false,
  })

  const vencimientos = data?.vencimientos ?? []
  if (!vencimientos.length) return null

  return (
    <div className="grid gap-2 border border-dashed border-border bg-muted/50 px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        Próximos vencimientos registrados en compras
      </p>
      <ul className="grid gap-1.5">
        {vencimientos.map((v) => (
          <li
            key={`${v.fechaVencimiento}-${v.lote ?? ''}-${v.numeroFactura ?? v.fechaCompra}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-foreground">
              {v.fechaVencimiento}
              {v.lote && <span className="text-muted-foreground"> · Lote {v.lote}</span>}
              <span className="block text-xs text-muted-foreground">
                {v.proveedor}
                {v.numeroFactura && ` · Factura ${v.numeroFactura}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onUsar(v.fechaVencimiento, v.lote || '')}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Usar esta fecha
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
