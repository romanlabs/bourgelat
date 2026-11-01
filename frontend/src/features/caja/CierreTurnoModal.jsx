import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { Select } from '@/components/ui/select'
import {
  CATEGORIA_DIFERENCIA_OPCIONES,
  MIN_CARACTERES_JUSTIFICACION,
  NOTAS_RAPIDAS_DIFERENCIA_LEVE,
  UMBRAL_COMENTARIO_OPCIONAL,
  UMBRAL_REVISION_ADMIN,
} from './cajaConstants'

const buildInitialForm = () => ({ montoFinalContado: '', observacionesCierre: '', categoriaDiferencia: '' })

export default function CierreTurnoModal({
  open,
  onClose,
  turnoActivo,
  cerrarTurnoMutation,
  turnoId = null,
  titulo = 'Cerrar turno de caja',
  descripcion = 'Cuenta el efectivo físico en caja para comparar con lo esperado por el sistema.',
}) {
  const [form, setForm] = useState(buildInitialForm)

  const montoFinalEsperado = useMemo(() => {
    if (!turnoActivo) return 0
    return (
      Number(turnoActivo.montoInicial || 0) +
      Number(turnoActivo.totalVentasEfectivo || 0) +
      Number(turnoActivo.totalIngresosManuales || 0) -
      Number(turnoActivo.totalEgresosManuales || 0)
    )
  }, [turnoActivo])

  const montoContado = parseInt(form.montoFinalContado, 10)
  const tieneMontoValido = Number.isFinite(montoContado) && montoContado >= 0
  const diferencia = tieneMontoValido ? montoContado - montoFinalEsperado : null
  const diferenciaAbs = diferencia === null ? 0 : Math.abs(diferencia)

  const requiereJustificacion = tieneMontoValido && diferenciaAbs > UMBRAL_COMENTARIO_OPCIONAL
  const requiereRevisionAdmin = tieneMontoValido && diferenciaAbs > UMBRAL_REVISION_ADMIN
  const comentarioValido = form.observacionesCierre.trim().length >= MIN_CARACTERES_JUSTIFICACION

  const puedeConfirmar =
    tieneMontoValido &&
    (!requiereJustificacion || (comentarioValido && form.categoriaDiferencia))

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setForm(buildInitialForm())
      onClose()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!puedeConfirmar) return

    const payload = {
      montoFinalContado: montoContado,
      observacionesCierre: form.observacionesCierre.trim() || undefined,
      categoriaDiferencia: form.categoriaDiferencia || undefined,
    }

    cerrarTurnoMutation.mutate(
      turnoId ? { turnoId, payload } : payload,
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl bg-muted px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-muted-foreground">Efectivo esperado</span>
              <span className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">{formatCurrency(montoFinalEsperado)}</span>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">
              Efectivo contado
            </span>
            <MoneyInput
              value={form.montoFinalContado}
              // $0 contado es un cierre válido (turno sin efectivo), no se convierte en vacío
              onChange={(value) => setForm((curr) => ({ ...curr, montoFinalContado: String(value) }))}
              placeholder="$ 0"
              autoFocus
              className="h-14 w-full rounded-lg border border-input bg-card px-4 text-right text-2xl font-semibold tracking-[-0.02em] tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {tieneMontoValido && diferenciaAbs === 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" />
              Cierre cuadrado, sin diferencias.
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold tabular-nums ${
                diferencia > 0
                  ? 'bg-info-soft text-info'
                  : 'bg-warning-soft text-warning'
              }`}
            >
              {diferencia > 0 ? 'Sobrante' : 'Faltante'} de {formatCurrency(diferenciaAbs)}
            </div>
          )}

          {requiereRevisionAdmin && (
            <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              La diferencia supera $30.000. Se le avisará al administrador de la clínica.
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && diferenciaAbs <= UMBRAL_COMENTARIO_OPCIONAL && (
            <div className="flex flex-wrap gap-1.5">
              {NOTAS_RAPIDAS_DIFERENCIA_LEVE.map((nota) => (
                <button
                  key={nota}
                  type="button"
                  onClick={() => setForm((curr) => ({ ...curr, observacionesCierre: nota }))}
                  aria-pressed={form.observacionesCierre === nota}
                  className={`h-9 rounded-lg px-3 text-[13px] font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.observacionesCierre === nota
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-secondary-foreground hover:brightness-95'
                  }`}
                >
                  {nota}
                </button>
              ))}
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Comentario {requiereJustificacion ? '(obligatorio, mínimo 20 caracteres)' : '(opcional)'}
              </span>
              <textarea
                value={form.observacionesCierre}
                onChange={(event) => setForm((curr) => ({ ...curr, observacionesCierre: event.target.value }))}
                placeholder="Explica qué pudo causar la diferencia"
                className={`min-h-20 w-full rounded-lg border bg-card px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  requiereJustificacion && !comentarioValido ? 'border-danger' : 'border-input'
                }`}
              />
            </label>
          )}

          {requiereJustificacion && (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Categoría (obligatoria)
              </span>
              <Select
                variant="field"
                aria-label="Categoría de la diferencia"
                className={`rounded-lg ${!form.categoriaDiferencia ? 'border-danger' : ''}`}
                placeholder="Selecciona una categoría"
                value={form.categoriaDiferencia}
                onValueChange={(value) => setForm((curr) => ({ ...curr, categoriaDiferencia: value }))}
                options={CATEGORIA_DIFERENCIA_OPCIONES}
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!puedeConfirmar || cerrarTurnoMutation.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-base disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
          >
            {cerrarTurnoMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cerrando turno...
              </>
            ) : (
              'Cerrar turno'
            )}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
