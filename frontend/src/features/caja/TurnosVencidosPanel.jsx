import { useState } from 'react'
import { DataTable, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import CierreTurnoModal from './CierreTurnoModal'
import PanelListaMovil from './PanelListaMovil'

const montoEsperado = (turno) =>
  Number(turno.montoInicial || 0) +
  Number(turno.totalVentasEfectivo || 0) +
  Number(turno.totalIngresosManuales || 0) -
  Number(turno.totalEgresosManuales || 0)

// Solo para admin/superadmin: turnos abiertos desde un dia anterior, de
// cualquier cajero de la clinica, que quedaron sin cerrar. El cajero dueno
// del turno esta bloqueado para vender hasta cerrarlo; este panel permite
// a un admin cerrarlo en su nombre si el cajero ya no puede hacerlo.
export default function TurnosVencidosPanel({ cajaHook }) {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const { turnosVencidos, turnosVencidosQuery, cerrarTurnoAdminMutation } = cajaHook

  if (!turnosVencidosQuery.isLoading && turnosVencidos.length === 0) {
    return null
  }

  const rows = turnosVencidos.map((turno) => ({
    id: turno.id,
    cajero: turno.usuario?.nombre || 'Sin nombre',
    fechaApertura: formatLongDate(turno.fechaApertura),
    esperado: turno,
  }))
  const title = 'Turnos vencidos'
  const subtitle = 'Quedaron abiertos desde un día anterior. El cajero no puede facturar hasta cerrarlos.'
  const emptyTitle = 'Sin turnos vencidos'
  const emptyBody = 'Ningún turno quedó abierto de un día anterior.'
  const pillEsperado = (row) => (
    <StatusPill tone="bg-warning-soft text-warning tabular-nums">
      {formatCurrency(montoEsperado(row.esperado))}
    </StatusPill>
  )

  return (
    <>
      <div className="hidden lg:block">
        <DataTable
          title={title}
          subtitle={subtitle}
          rows={rows}
          columns={[
            { key: 'cajero', label: 'Cajero' },
            { key: 'fechaApertura', label: 'Abierto desde' },
            {
              key: 'esperado',
              label: 'Efectivo esperado',
              render: pillEsperado,
            },
            {
              key: 'acciones',
              label: 'Acciones',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setTurnoSeleccionado(row.esperado)}
                  className="inline-flex h-9 items-center px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[13px]"
                >
                  Cerrar turno
                </button>
              ),
            },
          ]}
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
        />
      </div>

      <PanelListaMovil
        title={title}
        subtitle={subtitle}
        vacio={rows.length === 0}
        emptyTitle={emptyTitle}
        emptyBody={emptyBody}
      >
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[15px] font-semibold text-foreground">{row.cajero}</span>
                <span className="text-[13px] text-muted-foreground">Abierto desde {row.fechaApertura}</span>
              </span>
              <span className="shrink-0">{pillEsperado(row)}</span>
            </div>
            <button
              type="button"
              onClick={() => setTurnoSeleccionado(row.esperado)}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cerrar turno
            </button>
          </li>
        ))}
      </PanelListaMovil>

      {turnoSeleccionado ? (
        <CierreTurnoModal
          open
          onClose={() => setTurnoSeleccionado(null)}
          turnoActivo={turnoSeleccionado}
          cerrarTurnoMutation={cerrarTurnoAdminMutation}
          turnoId={turnoSeleccionado.id}
          titulo={`Cerrar turno de ${turnoSeleccionado.usuario?.nombre || 'este cajero'}`}
          descripcion="Este turno quedó abierto de un día anterior. Cuenta el efectivo físico para cerrarlo en nombre del cajero."
        />
      ) : null}
    </>
  )
}
