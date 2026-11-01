import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataTable } from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import PanelListaMovil from './PanelListaMovil'
import { CATEGORIA_DIFERENCIA_LABELS, claseFechaFiltro, claseToggleLista } from './cajaConstants'

// Panel solo-admin: agrupa los descuadres de cierre por cajero y categoria en
// un periodo, para detectar patrones (ej. "Juan - causa_desconocida - 8 veces").
export default function ReporteDescuadresPanel({ cajaHook }) {
  const [expandido, setExpandido] = useState(false)
  const { reporteFiltros, setReporteFiltros, reporteDescuadres } = cajaHook

  const filasOrdenadas = [...reporteDescuadres].sort(
    (a, b) => b.cantidadOcurrencias - a.cantidadOcurrencias
  )
  const rows = filasOrdenadas.map((fila, index) => ({
    id: `${fila.usuarioId}-${fila.categoriaDiferencia}-${index}`,
    cajero: fila.usuarioNombre || 'Sin nombre',
    categoria: fila.categoriaDiferencia,
    cantidadOcurrencias: fila.cantidadOcurrencias,
    sumaDiferencias: fila.sumaDiferencias,
  }))
  const title = 'Reporte de descuadres por cajero'
  const subtitle =
    'Conteo de diferencias de caja agrupadas por cajero y categoría en el periodo. Sirve para detectar patrones que se repiten.'
  const emptyTitle = 'Sin descuadres en el periodo'
  const emptyBody = 'No se registraron diferencias de caja categorizadas en el rango de fechas seleccionado.'

  const toggle = (movil) => (
    <button
      type="button"
      onClick={() => setExpandido((curr) => !curr)}
      aria-expanded={expandido}
      className={claseToggleLista(movil)}
    >
      {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      {expandido ? 'Ocultar' : `Ver reporte (${filasOrdenadas.length})`}
    </button>
  )

  const filtros = (movil) => (
    <>
      <span className={`text-[13px] font-semibold text-muted-foreground ${movil ? 'w-full' : ''}`}>Periodo</span>
      <input
        type="date"
        aria-label="Fecha inicial del periodo"
        value={reporteFiltros.fechaInicio}
        onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
        className={claseFechaFiltro(movil)}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <input
        type="date"
        aria-label="Fecha final del periodo"
        value={reporteFiltros.fechaFin}
        onChange={(event) => setReporteFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
        className={claseFechaFiltro(movil)}
      />
    </>
  )

  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          collapsed={!expandido}
          title={title}
          subtitle={subtitle}
          rows={rows}
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
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          action={toggle(false)}
          filters={filtros(false)}
        />
      </div>

      <PanelListaMovil
        collapsed={!expandido}
        title={title}
        subtitle={subtitle}
        action={toggle(true)}
        filters={filtros(true)}
        vacio={rows.length === 0}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
      >
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-[15px] font-semibold text-foreground">{row.cajero}</span>
              <span className="text-[13px] text-muted-foreground">
                {CATEGORIA_DIFERENCIA_LABELS[row.categoria] || row.categoria}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className="text-[15px] font-semibold tabular-nums text-foreground">
                {row.cantidadOcurrencias} {Number(row.cantidadOcurrencias) === 1 ? 'vez' : 'veces'}
              </span>
              <span className="text-[13px] tabular-nums text-muted-foreground">{formatCurrency(row.sumaDiferencias)}</span>
            </span>
          </li>
        ))}
      </PanelListaMovil>
    </>
  )
}
