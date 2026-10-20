import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataTable } from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { CATEGORIA_DIFERENCIA_LABELS } from './cajaConstants'

// Panel solo-admin: agrupa los descuadres de cierre por cajero y categoria en
// un periodo, para detectar patrones (ej. "Juan - causa_desconocida - 8 veces").
export default function ReporteDescuadresPanel({ cajaHook }) {
  const [expandido, setExpandido] = useState(false)
  const { reporteFiltros, setReporteFiltros, reporteDescuadres } = cajaHook

  const filasOrdenadas = [...reporteDescuadres].sort(
    (a, b) => b.cantidadOcurrencias - a.cantidadOcurrencias
  )

  return (
    <DataTable
      collapsed={!expandido}
      title="Reporte de descuadres por cajero"
      subtitle="Conteo de diferencias de caja agrupadas por cajero y categoría en el periodo. Sirve para detectar patrones que se repiten."
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
          label: 'Categoría',
          render: (row) => CATEGORIA_DIFERENCIA_LABELS[row.categoria] || row.categoria,
        },
        {
          key: 'cantidadOcurrencias',
          label: 'Ocurrencias',
          render: (row) => <span className="font-semibold tabular-nums">{row.cantidadOcurrencias}</span>,
        },
        {
          key: 'sumaDiferencias',
          label: 'Suma de diferencias',
          render: (row) => <span className="tabular-nums">{formatCurrency(row.sumaDiferencias)}</span>,
        },
      ]}
      emptyTitle="Sin descuadres en el periodo"
      emptyBody="No se registraron diferencias de caja categorizadas en el rango de fechas seleccionado."
      action={
        <button
          type="button"
          onClick={() => setExpandido((curr) => !curr)}
          aria-expanded={expandido}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expandido ? 'Ocultar' : `Ver reporte (${filasOrdenadas.length})`}
        </button>
      }
      filters={
        <>
          <span className="text-[13px] font-semibold text-muted-foreground">Periodo</span>
          <input
            type="date"
            value={reporteFiltros.fechaInicio}
            onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
            className="h-10 w-[150px] rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <input
            type="date"
            value={reporteFiltros.fechaFin}
            onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
            className="h-10 w-[150px] rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </>
      }
    />
  )
}
