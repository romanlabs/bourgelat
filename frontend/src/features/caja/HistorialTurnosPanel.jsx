import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataTable, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import TurnoDetalleModal from './TurnoDetalleModal'
import { CATEGORIA_DIFERENCIA_LABELS } from './cajaConstants'

const getDiferenciaTone = (turno) => {
  if (turno.requiereRevisionAdmin) return 'border-red-300 bg-red-50 text-red-700'
  if (Number(turno.diferencia) === 0) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-amber-200 bg-amber-50 text-amber-800'
}

export default function HistorialTurnosPanel({ cajaHook, esAdmin }) {
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState(null)
  const [expandido, setExpandido] = useState(false)
  const { historialFiltros, setHistorialFiltros, turnosHistorial } = cajaHook

  return (
    <>
      <DataTable
        collapsed={!expandido}
        title="Historial de turnos cerrados"
        subtitle={
          esAdmin
            ? 'Historial completo de la clinica. Los turnos con diferencia mayor a $30.000 quedan marcados para revision.'
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
                {row.diferencia.requiereRevisionAdmin ? ' - Revisar' : ''}
              </StatusPill>
            ),
          },
          {
            key: 'categoria',
            label: 'Categoria',
            render: (row) => CATEGORIA_DIFERENCIA_LABELS[row.categoria] || '-',
          },
          {
            key: 'acciones',
            label: 'Acciones',
            render: (row) => (
              <button
                type="button"
                onClick={() => setTurnoSeleccionadoId(row.id)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
              >
                Ver detalle
              </button>
            ),
          },
        ]}
        emptyTitle="Aun no hay turnos cerrados"
        emptyBody="Cuando cierres un turno de caja, aparecera aqui con su diferencia y trazabilidad."
        action={
          <button
            type="button"
            onClick={() => setExpandido((curr) => !curr)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition hover:bg-muted"
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expandido ? 'Ocultar' : `Ver historial (${turnosHistorial.length})`}
          </button>
        }
        filters={
          <>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Periodo</span>
            <input
              type="date"
              value={historialFiltros.fechaInicio}
              onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
              className="h-8 w-[130px] rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <input
              type="date"
              value={historialFiltros.fechaFin}
              onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
              className="h-8 w-[130px] rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-primary"
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
