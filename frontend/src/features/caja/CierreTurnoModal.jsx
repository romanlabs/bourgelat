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

export default function CierreTurnoModal({ open, onClose, turnoActivo, cerrarTurnoMutation }) {
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

    cerrarTurnoMutation.mutate(
      {
        montoFinalContado: montoContado,
        observacionesCierre: form.observacionesCierre.trim() || undefined,
        categoriaDiferencia: form.categoriaDiferencia || undefined,
      },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar turno de caja</DialogTitle>
          <DialogDescription>Cuenta el efectivo fisico en caja para comparar con lo esperado por el sistema.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Efectivo esperado</span>
              <span className="font-bold tabular-nums text-foreground">{formatCurrency(montoFinalEsperado)}</span>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Efectivo contado
            </span>
            <MoneyInput
              value={form.montoFinalContado}
              onChange={(value) => setForm((curr) => ({ ...curr, montoFinalContado: value === 0 ? '' : String(value) }))}
              placeholder="$ 0"
              autoFocus
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-right text-xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </label>

          {tieneMontoValido && diferenciaAbs === 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Cierre cuadrado, sin diferencias.
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                diferencia > 0 ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {diferencia > 0 ? 'Sobrante' : 'Faltante'} de {formatCurrency(diferenciaAbs)}
            </div>
          )}

          {requiereRevisionAdmin && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              La diferencia supera $30.000. Se notificara automaticamente al administrador de la clinica.
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && diferenciaAbs <= UMBRAL_COMENTARIO_OPCIONAL && (
            <div className="flex flex-wrap gap-1.5">
              {NOTAS_RAPIDAS_DIFERENCIA_LEVE.map((nota) => (
                <button
                  key={nota}
                  type="button"
                  onClick={() => setForm((curr) => ({ ...curr, observacionesCierre: nota }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    form.observacionesCierre === nota
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {nota}
                </button>
              ))}
            </div>
          )}

          {tieneMontoValido && diferenciaAbs > 0 && (
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comentario {requiereJustificacion ? '(obligatorio, minimo 20 caracteres)' : '(opcional)'}
              </span>
              <textarea
                value={form.observacionesCierre}
                onChange={(event) => setForm((curr) => ({ ...curr, observacionesCierre: event.target.value }))}
                placeholder="Explica que pudo causar la diferencia"
                className={`min-h-20 w-full rounded-xl border px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-primary ${
                  requiereJustificacion && !comentarioValido ? 'border-red-300' : 'border-border'
                }`}
              />
            </label>
          )}

          {requiereJustificacion && (
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categoria (obligatoria)
              </span>
              <Select
                variant="field"
                aria-label="Categoria de la diferencia"
                className={`rounded-xl ${!form.categoriaDiferencia ? 'border-red-300' : ''}`}
                placeholder="Selecciona una categoria"
                value={form.categoriaDiferencia}
                onValueChange={(value) => setForm((curr) => ({ ...curr, categoriaDiferencia: value }))}
                options={CATEGORIA_DIFERENCIA_OPCIONES}
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!puedeConfirmar || cerrarTurnoMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
