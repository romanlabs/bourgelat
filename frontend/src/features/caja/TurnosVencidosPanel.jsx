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
        subtitle="Turnos que quedaron abiertos desde un dia anterior. El cajero no puede facturar hasta cerrarlos."
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
              <StatusPill tone="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
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
                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:bg-muted"
              >
                Cerrar turno
              </button>
            ),
          },
        ]}
        emptyTitle="Sin turnos vencidos"
        emptyBody="Ningun turno quedo abierto de un dia anterior."
      />

      {turnoSeleccionado ? (
        <CierreTurnoModal
          open
          onClose={() => setTurnoSeleccionado(null)}
          turnoActivo={turnoSeleccionado}
          cerrarTurnoMutation={cerrarTurnoAdminMutation}
          turnoId={turnoSeleccionado.id}
          titulo={`Cerrar turno de ${turnoSeleccionado.usuario?.nombre || 'este cajero'}`}
          descripcion="Este turno quedo abierto de un dia anterior. Cuenta el efectivo fisico para cerrarlo en nombre del cajero."
        />
      ) : null}
    </>
  )
}
