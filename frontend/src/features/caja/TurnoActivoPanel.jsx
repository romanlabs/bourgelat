import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Banknote, ChevronDown, ChevronUp, PlusCircle, Wallet } from 'lucide-react'
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
  const [movimientosExpandido, setMovimientosExpandido] = useState(false)

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
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
          <StatusPill tone="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200">Turno abierto</StatusPill>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Fondo inicial</p>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              {formatCurrency(turnoActivo.montoInicial)}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Efectivo con el que abriste el turno</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ventas en efectivo</p>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              {formatCurrency(turnoActivo.totalVentasEfectivo)}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Ventas del sistema pagadas en efectivo</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ingresos / egresos</p>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              +{formatCurrency(turnoActivo.totalIngresosManuales)} / -{formatCurrency(turnoActivo.totalEgresosManuales)}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Movimientos manuales, no incluye ventas</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Efectivo esperado</p>
            <p className="mt-1 text-base font-bold tabular-nums text-primary">{formatCurrency(montoFinalEsperado)}</p>
            <p className="mt-0.5 text-[10px] leading-tight text-primary/70">Fondo + ventas + ingresos - egresos</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMovimientoOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <PlusCircle className="h-4 w-4" />
            Registrar movimiento
          </button>
          <button
            type="button"
            onClick={() => setCierreOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Banknote className="h-4 w-4" />
            Cerrar turno
          </button>
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Movimientos manuales del turno"
        action={
          <button
            type="button"
            onClick={() => setMovimientosExpandido((curr) => !curr)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition hover:bg-muted"
          >
            {movimientosExpandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {movimientosExpandido ? 'Ocultar' : `Ver movimientos (${movimientos.length})`}
          </button>
        }
      >
        {movimientosExpandido ? (
          movimientos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
              Aun no hay movimientos manuales registrados en este turno.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-3">
                    {movimiento.tipo === 'ingreso' ? (
                      <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                      movimiento.tipo === 'ingreso' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    }`}
                  >
                    {movimiento.tipo === 'ingreso' ? '+' : '-'}
                    {formatCurrency(movimiento.monto)}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : null}
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
