import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataTable, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import TurnoDetalleModal from './TurnoDetalleModal'
import { useResaltado } from '@/lib/useResaltado'
import { CATEGORIA_DIFERENCIA_LABELS } from './cajaConstants'

const getDiferenciaTone = (turno) => {
  if (turno.requiereRevisionAdmin) return 'bg-danger-soft text-danger tabular-nums'
  if (Number(turno.diferencia) === 0) return 'bg-success-soft text-success tabular-nums'
  return 'bg-warning-soft text-warning tabular-nums'
}

export default function HistorialTurnosPanel({ cajaHook, esAdmin }) {
  // El aviso de cierre de turno llega con ese turno: se abre su detalle.
  const turnoDeAviso = useResaltado('turno')
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState(turnoDeAviso)
  const [expandido, setExpandido] = useState(false)
  const { historialFiltros, setHistorialFiltros, turnosHistorial } = cajaHook

  return (
    <>
      <DataTable
        collapsed={!expandido}
        title="Historial de turnos cerrados"
        subtitle={
          esAdmin
            ? 'Historial completo de la clínica. Los turnos con diferencia mayor a $30.000 quedan marcados para revisión.'
            : 'Tu historial de turnos cerrados.'
        }
        rows={turnosHistorial.map((turno) => ({
          id: turno.id,
          cajero: turno.usuario?.nombre || 'Sin nombre',
          fechaCierre: formatLongDate(turno.fechaCierre),
          diferencia: turno,
          categoria: turno.categoriaDiferencia,
        }))}
        columns={[
          { key: 'cajero', label: 'Cajero' },
          { key: 'fechaCierre', label: 'Cierre' },
          {
            key: 'diferencia',
            label: 'Diferencia',
            render: (row) => (
              <StatusPill tone={getDiferenciaTone(row.diferencia)}>
                {formatCurrency(row.diferencia.diferencia)}
                {row.diferencia.requiereRevisionAdmin ? ' · Revisar' : ''}
              </StatusPill>
            ),
          },
          {
            key: 'categoria',
            label: 'Categoría',
            render: (row) => CATEGORIA_DIFERENCIA_LABELS[row.categoria] || '-',
          },
          {
            key: 'acciones',
            label: 'Acciones',
            render: (row) => (
              <button
                type="button"
                onClick={() => setTurnoSeleccionadoId(row.id)}
                className="inline-flex h-9 items-center px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[13px]"
              >
                Ver detalle
              </button>
            ),
          },
        ]}
        emptyTitle="Aún no hay turnos cerrados"
        emptyBody="Cuando cierres un turno de caja, aparecerá aquí con su diferencia y trazabilidad."
        action={
          <button
            type="button"
            onClick={() => setExpandido((curr) => !curr)}
            aria-expanded={expandido}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expandido ? 'Ocultar' : `Ver historial (${turnosHistorial.length})`}
          </button>
        }
        filters={
          <>
            <span className="text-[13px] font-semibold text-muted-foreground">Periodo</span>
            <input
              type="date"
              value={historialFiltros.fechaInicio}
              onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
              className="h-10 w-[150px] rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-sm text-muted-foreground">a</span>
            <input
              type="date"
              value={historialFiltros.fechaFin}
              onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
              className="h-10 w-[150px] rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        }
      />

      {turnoSeleccionadoId ? (
        <TurnoDetalleModal turnoId={turnoSeleccionadoId} onClose={() => setTurnoSeleccionadoId(null)} />
      ) : null}
    </>
  )
}
