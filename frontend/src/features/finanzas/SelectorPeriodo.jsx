import { useMemo } from 'react'
import { Select } from '@/components/ui/select'
import { mesLocal } from '@/lib/fecha'
import { PRESETS_ANALISIS, aniosDisponibles } from '@/features/finanzas/analisisPeriodo'

const inputFecha =
  'h-11 rounded-lg border border-input bg-card px-3 text-base tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 lg:text-sm'

export default function SelectorPeriodo({ preset, onPreset, mes, onMes, anio, onAnio, personalizado, onPersonalizado, completo, avisoBloqueo }) {
  const anios = useMemo(() => aniosDisponibles().map((a) => ({ value: String(a), label: String(a) })), [])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Desplegable y no botones: cabe junto a la cifra sin bajar a otra fila. */}
      <Select
        aria-label="Periodo"
        className="h-11 lg:h-10"
        value={preset}
        onValueChange={onPreset}
        options={PRESETS_ANALISIS.map((opcion) => ({
          value: opcion.id,
          label: opcion.largo && !completo ? `${opcion.label} · ${avisoBloqueo}` : opcion.label,
          disabled: opcion.largo && !completo,
        }))}
      />

      {preset === 'mes' ? (
        <input
          type="month"
          value={mes}
          max={mesLocal()}
          onChange={(e) => e.target.value && onMes(e.target.value)}
          aria-label="Mes"
          className={inputFecha}
        />
      ) : null}

      {preset === 'anio' ? (
        <Select aria-label="Año" className="h-11 lg:h-10" value={String(anio)} onValueChange={(valor) => onAnio(Number(valor))} options={anios} />
      ) : null}

      {preset === 'personalizado' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={personalizado.fechaInicio}
            max={personalizado.fechaFin}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaInicio: e.target.value })}
            aria-label="Fecha inicial del periodo"
            className={inputFecha}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <input
            type="date"
            value={personalizado.fechaFin}
            min={personalizado.fechaInicio}
            onChange={(e) => e.target.value && onPersonalizado({ ...personalizado, fechaFin: e.target.value })}
            aria-label="Fecha final del periodo"
            className={inputFecha}
          />
        </div>
      ) : null}

    </div>
  )
}
