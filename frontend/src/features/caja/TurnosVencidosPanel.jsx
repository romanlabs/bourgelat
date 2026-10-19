import { useState } from 'react'
import { DataTable, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import CierreTurnoModal from './CierreTurnoModal'

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

  return (
    <>
      <DataTable
        title="Turnos vencidos"
        subtitle="Quedaron abiertos desde un día anterior. El cajero no puede facturar hasta cerrarlos."
        rows={turnosVencidos.map((turno) => ({
          id: turno.id,
          cajero: turno.usuario?.nombre || 'Sin nombre',
          fechaApertura: formatLongDate(turno.fechaApertura),
          esperado: turno,
        }))}
        columns={[
          { key: 'cajero', label: 'Cajero' },
          { key: 'fechaApertura', label: 'Abierto desde' },
          {
            key: 'esperado',
            label: 'Efectivo esperado',
            render: (row) => (
              <StatusPill tone="bg-warning-soft text-warning tabular-nums">
                {formatCurrency(montoEsperado(row.esperado))}
              </StatusPill>
            ),
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
        emptyTitle="Sin turnos vencidos"
        emptyBody="Ningún turno quedó abierto de un día anterior."
      />

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
