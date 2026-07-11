import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Banknote, PlusCircle, Wallet } from 'lucide-react'
import { DashboardPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { EmptyState } from '@/components/shared/EmptyState'
import AperturaTurnoModal from './AperturaTurnoModal'
import MovimientoCajaModal from './MovimientoCajaModal'
import CierreTurnoModal from './CierreTurnoModal'
import { MOVIMIENTO_CAJA_ICONS, MOVIMIENTO_CAJA_MOTIVOS } from './cajaConstants'

const motivoLabel = (motivo) => MOVIMIENTO_CAJA_MOTIVOS.find((m) => m.value === motivo)?.label || motivo

export default function TurnoActivoPanel({ cajaHook }) {
  const [aperturaOpen, setAperturaOpen] = useState(false)
  const [movimientoOpen, setMovimientoOpen] = useState(false)
  const [cierreOpen, setCierreOpen] = useState(false)

  const { turnoActivo, turnoActivoQuery, movimientos, abrirTurnoMutation, registrarMovimientoMutation, cerrarTurnoMutation } = cajaHook

  const montoFinalEsperado = useMemo(() => {
    if (!turnoActivo) return 0
    return (
      Number(turnoActivo.montoInicial || 0) +
      Number(turnoActivo.totalVentasEfectivo || 0) +
      Number(turnoActivo.totalIngresosManuales || 0) -
      Number(turnoActivo.totalEgresosManuales || 0)
    )
  }, [turnoActivo])

  if (turnoActivoQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-[24px] border border-border bg-muted" />
        ))}
      </div>
    )
  }

  if (!turnoActivo) {
    return (
      <>
        <DashboardPanel title="Turno de caja">
          <EmptyState
            icon={<Wallet />}
            variant="primary"
            title="No tienes un turno de caja abierto"
            description="Abre tu turno registrando el fondo inicial en efectivo antes de operar la caja."
            action={
              <button
                type="button"
                onClick={() => setAperturaOpen(true)}
                className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Wallet className="h-4 w-4" />
                Abrir turno
              </button>
            }
          />
        </DashboardPanel>
        <AperturaTurnoModal
          open={aperturaOpen}
          onClose={() => setAperturaOpen(false)}
          abrirTurnoMutation={abrirTurnoMutation}
        />
      </>
    )
  }

  return (
    <div className="space-y-5">
      <DashboardPanel
        title="Turno activo"
        subtitle="Resumen en vivo del efectivo del turno. El sistema recalcula el efectivo esperado con cada venta y movimiento."
        action={
          <StatusPill tone="border-emerald-200 bg-emerald-50 text-emerald-700">Turno abierto</StatusPill>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Fondo inicial</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
              {formatCurrency(turnoActivo.montoInicial)}
            </p>
          </div>
          <div className="rounded-[20px] border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ventas en efectivo</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
              {formatCurrency(turnoActivo.totalVentasEfectivo)}
            </p>
          </div>
          <div className="rounded-[20px] border border-border bg-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ingresos / egresos</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
              +{formatCurrency(turnoActivo.totalIngresosManuales)} / -{formatCurrency(turnoActivo.totalEgresosManuales)}
            </p>
          </div>
          <div className="rounded-[20px] border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Efectivo esperado</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-primary">{formatCurrency(montoFinalEsperado)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMovimientoOpen(true)}
            className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <PlusCircle className="h-4 w-4" />
            Registrar movimiento
          </button>
          <button
            type="button"
            onClick={() => setCierreOpen(true)}
            className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Banknote className="h-4 w-4" />
            Cerrar turno
          </button>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Movimientos manuales del turno" subtitle="Ingresos y egresos de efectivo distintos a las ventas.">
        {movimientos.length === 0 ? (
          <div className="border border-dashed border-border bg-muted px-4 py-6 text-sm leading-7 text-muted-foreground">
            Aun no hay movimientos manuales registrados en este turno.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {movimientos.map((movimiento) => (
              <div key={movimiento.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {movimiento.tipo === 'ingreso' ? (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{motivoLabel(movimiento.motivo)}</p>
                    {movimiento.observaciones ? (
                      <p className="text-xs text-muted-foreground">{movimiento.observaciones}</p>
                    ) : null}
                  </div>
                </div>
                <p
                  className={`text-sm font-bold tabular-nums ${
                    movimiento.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {movimiento.tipo === 'ingreso' ? '+' : '-'}
                  {formatCurrency(movimiento.monto)}
                </p>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>

      <MovimientoCajaModal
        open={movimientoOpen}
        onClose={() => setMovimientoOpen(false)}
        registrarMovimientoMutation={registrarMovimientoMutation}
      />
      <CierreTurnoModal
        open={cierreOpen}
        onClose={() => setCierreOpen(false)}
        turnoActivo={turnoActivo}
        cerrarTurnoMutation={cerrarTurnoMutation}
      />
    </div>
  )
}
