import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DataTable, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import TurnoDetalleModal from './TurnoDetalleModal'
import PanelListaMovil from './PanelListaMovil'
import { useResaltado } from '@/lib/useResaltado'
import { CATEGORIA_DIFERENCIA_LABELS, claseFechaFiltro, claseToggleLista } from './cajaConstants'

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

  const subtitle = esAdmin
    ? 'Historial completo de la clínica. Los turnos con diferencia mayor a $30.000 quedan marcados para revisión.'
    : 'Tu historial de turnos cerrados.'
  const rows = turnosHistorial.map((turno) => ({
    id: turno.id,
    cajero: turno.usuario?.nombre || 'Sin nombre',
    fechaCierre: formatLongDate(turno.fechaCierre),
    diferencia: turno,
    categoria: turno.categoriaDiferencia,
  }))
  const emptyTitle = 'Aún no hay turnos cerrados'
  const emptyBody = 'Cuando cierres un turno de caja, aparecerá aquí con su diferencia y trazabilidad.'

  const pillDiferencia = (row) => (
    <StatusPill tone={getDiferenciaTone(row.diferencia)}>
      {formatCurrency(row.diferencia.diferencia)}
      {row.diferencia.requiereRevisionAdmin ? ' · Revisar' : ''}
    </StatusPill>
  )

  const toggle = (movil) => (
    <button
      type="button"
      onClick={() => setExpandido((curr) => !curr)}
      aria-expanded={expandido}
      className={claseToggleLista(movil)}
    >
      {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      {expandido ? 'Ocultar' : `Ver historial (${turnosHistorial.length})`}
    </button>
  )

  const filtros = (movil) => (
    <>
      <span className={`text-[13px] font-semibold text-muted-foreground ${movil ? 'w-full' : ''}`}>Periodo</span>
      <input
        type="date"
        aria-label="Fecha inicial del periodo"
        value={historialFiltros.fechaInicio}
        onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaInicio: event.target.value }))}
        className={claseFechaFiltro(movil)}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <input
        type="date"
        aria-label="Fecha final del periodo"
        value={historialFiltros.fechaFin}
        onChange={(event) => setHistorialFiltros((curr) => ({ ...curr, fechaFin: event.target.value }))}
        className={claseFechaFiltro(movil)}
      />
    </>
  )

  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          collapsed={!expandido}
          title="Historial de turnos cerrados"
          subtitle={subtitle}
          rows={rows}
          columns={[
            { key: 'cajero', label: 'Cajero' },
            { key: 'fechaCierre', label: 'Cierre' },
            {
              key: 'diferencia',
              label: 'Diferencia',
              render: pillDiferencia,
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
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          action={toggle(false)}
          filters={filtros(false)}
        />
      </div>

      {/* Celular: cada turno es una tarjeta que abre su detalle. */}
      <PanelListaMovil
        collapsed={!expandido}
        title="Historial de turnos cerrados"
        subtitle={subtitle}
        action={toggle(true)}
        filters={filtros(true)}
        vacio={rows.length === 0}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
      >
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setTurnoSeleccionadoId(row.id)}
              className="flex min-h-[64px] w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[15px] font-semibold text-foreground">{row.cajero}</span>
                <span className="text-[13px] text-muted-foreground">Cierre: {row.fechaCierre}</span>
                {CATEGORIA_DIFERENCIA_LABELS[row.categoria] ? (
                  <span className="text-[13px] text-muted-foreground">{CATEGORIA_DIFERENCIA_LABELS[row.categoria]}</span>
                ) : null}
              </span>
              <span className="shrink-0">{pillDiferencia(row)}</span>
            </button>
          </li>
        ))}
      </PanelListaMovil>

      {turnoSeleccionadoId ? (
        <TurnoDetalleModal turnoId={turnoSeleccionadoId} onClose={() => setTurnoSeleccionadoId(null)} />
      ) : null}
    </>
  )
}
