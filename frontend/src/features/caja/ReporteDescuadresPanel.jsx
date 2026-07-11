import { DataTable } from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { CATEGORIA_DIFERENCIA_LABELS } from './cajaConstants'

// Panel solo-admin: agrupa los descuadres de cierre por cajero y categoria en
// un periodo, para detectar patrones (ej. "Juan - causa_desconocida - 8 veces").
export default function ReporteDescuadresPanel({ cajaHook }) {
  const { reporteFiltros, setReporteFiltros, reporteDescuadres } = cajaHook

  const filasOrdenadas = [...reporteDescuadres].sort(
    (a, b) => b.cantidadOcurrencias - a.cantidadOcurrencias
  )

  return (
    <DataTable
      title="Reporte de descuadres por cajero"
      subtitle="Conteo de diferencias de caja agrupadas por cajero y categoria en el periodo. Util para detectar patrones recurrentes."
      rows={filasOrdenadas.map((fila, index) => ({
        id: `${fila.usuarioId}-${fila.categoriaDiferencia}-${index}`,
        cajero: fila.usuarioNombre || 'Sin nombre',
        categoria: fila.categoriaDiferencia,
        cantidadOcurrencias: fila.cantidadOcurrencias,
        sumaDiferencias: fila.sumaDiferencias,
      }))}
      columns={[
        { key: 'cajero', label: 'Cajero' },
        {
          key: 'categoria',
          label: 'Categoria',
          render: (row) => CATEGORIA_DIFERENCIA_LABELS[row.categoria] || row.categoria,
        },
        {
          key: 'cantidadOcurrencias',
          label: 'Ocurrencias',
          render: (row) => <span className="font-bold tabular-nums">{row.cantidadOcurrencias}</span>,
        },
        {
          key: 'sumaDiferencias',
          label: 'Suma de diferencias',
          render: (row) => formatCurrency(row.sumaDiferencias),
        },
      ]}
      emptyTitle="Sin descuadres en el periodo"
      emptyBody="No se registraron diferencias de caja categorizadas en el rango de fechas seleccionado."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={reporteFiltros.fechaInicio}
            onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
            className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <input
            type="date"
            value={reporteFiltros.fechaFin}
            onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
            className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>
      }
    />
  )
}
