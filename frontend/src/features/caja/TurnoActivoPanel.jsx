import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, ChevronDown, ChevronUp, Clock, PlusCircle, Wallet } from 'lucide-react'
import { DashboardPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { EmptyState } from '@/components/shared/EmptyState'
import AperturaTurnoModal from './AperturaTurnoModal'
import MovimientoCajaModal from './MovimientoCajaModal'
import CierreTurnoModal from './CierreTurnoModal'
import { MOVIMIENTO_CAJA_ICONS, motivoMovimientoLabel as motivoLabel } from './cajaConstants'

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
          <div key={item} className="h-20 animate-pulse rounded-2xl bg-card" />
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
            description="Cuenta la base en efectivo y abre tu turno para empezar a cobrar."
            action={
              <button
                type="button"
                onClick={() => setAperturaOpen(true)}
                className="inline-flex h-11 items-center gap-2 px-5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        subtitle="El efectivo esperado se actualiza con cada venta y movimiento."
        action={
          turnoActivo.vencido ? (
            <StatusPill tone="bg-warning-soft text-warning">
              Turno vencido
            </StatusPill>
          ) : (
            <StatusPill tone="bg-success-soft text-success">Turno abierto</StatusPill>
          )
        }
      >
        {!turnoActivo.vencido && turnoActivo.fueraDeHorario ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-info-soft px-4 py-3 text-sm leading-6 text-info">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              La clínica ya cerró{turnoActivo.horaCierre ? ` (${turnoActivo.horaCierre})` : ''} y tu turno sigue abierto.
              Puedes seguir cobrando si lo necesitas, pero ciérralo antes de irte para dejar el corte del día listo.
            </p>
          </div>
        ) : null}

        {turnoActivo.vencido ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm leading-6 text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Este turno se abrió el {new Date(turnoActivo.fechaApertura).toLocaleDateString('es-CO')} y quedó abierto de un día anterior. No puedes seguir vendiendo ni registrar movimientos hasta cerrarlo.
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-muted px-4 py-3.5">
            <p className="text-[13px] font-semibold text-muted-foreground">Base inicial</p>
            <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">
              {formatCurrency(turnoActivo.montoInicial)}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Efectivo con el que abriste el turno</p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3.5">
            <p className="text-[13px] font-semibold text-muted-foreground">Ventas en efectivo</p>
            <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">
              {formatCurrency(turnoActivo.totalVentasEfectivo)}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Ventas del sistema pagadas en efectivo</p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-3.5">
            <p className="text-[13px] font-semibold text-muted-foreground">Ingresos / egresos</p>
            <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">
              +{formatCurrency(turnoActivo.totalIngresosManuales)} / -{formatCurrency(turnoActivo.totalEgresosManuales)}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">Movimientos manuales, no incluye ventas</p>
          </div>
          <div className="rounded-xl bg-accent px-4 py-3.5">
            <p className="text-[13px] font-semibold text-accent-foreground">Efectivo esperado</p>
            <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">{formatCurrency(montoFinalEsperado)}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-accent-foreground">Base + ventas + ingresos − egresos</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {!turnoActivo.vencido ? (
            <button
              type="button"
              onClick={() => setMovimientoOpen(true)}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 sm:flex-none sm:justify-start active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PlusCircle className="h-4 w-4" />
              Registrar movimiento
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setCierreOpen(true)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 px-5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-none sm:justify-start"
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
            aria-expanded={movimientosExpandido}
            className="inline-flex h-10 items-center gap-1.5 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {movimientosExpandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {movimientosExpandido ? 'Ocultar' : `Ver movimientos (${movimientos.length})`}
          </button>
        }
      >
        {movimientosExpandido ? (
          movimientos.length === 0 ? (
            <div className="rounded-xl bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
              Aún no hay movimientos manuales registrados en este turno.
            </div>
          ) : (
            <div className="space-y-1">
              {movimientos.map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-muted">
                  <div className="flex items-center gap-3">
                    {movimiento.tipo === 'ingreso' ? (
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-danger" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{motivoLabel(movimiento.motivo)}</p>
                      {movimiento.observaciones ? (
                        <p className="text-[13px] text-muted-foreground">{movimiento.observaciones}</p>
                      ) : null}
                    </div>
                  </div>
                  <p
                    className={`text-[15px] font-semibold tabular-nums ${
                      movimiento.tipo === 'ingreso' ? 'text-success' : 'text-danger'
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
