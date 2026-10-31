// Piezas compartidas por los paneles de lectura de Finanzas (Resumen, Medios de
// pago): el estado del periodo y las clases de tarjeta y segmentado. El selector
// del periodo está en SelectorPeriodo.jsx.
import { useMemo, useState } from 'react'
import { mesLocal } from '@/lib/fecha'
import {
  rangoDelAnio,
  rangoTrimestreActual,
  rangoUltimos12Meses,
} from '@/features/finanzas/analisisPeriodo'
import { nombreMes, rangoDelMes } from '@/features/finanzas/resumenFinanzas'

const compacto = (valor) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(valor || 0))
export const pesosCompactos = (valor) => `${Number(valor) < 0 ? '−' : ''}$${compacto(Math.abs(Number(valor || 0)))}`

export const tarjeta = 'rounded-2xl bg-card p-5 sm:p-6'
export const segmentado = 'flex gap-1 rounded-lg bg-secondary p-1'
export const botonSegmento = (activo) =>
  `h-8 rounded-md px-3 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    activo ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
  }`

// Estado del periodo elegido: el atajo y sus valores, el rango que piden los
// reportes y cómo se nombra en el titular.
export function usePeriodoAnalisis() {
  const [preset, setPreset] = useState('mes')
  const [mes, setMes] = useState(() => mesLocal())
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [personalizado, setPersonalizado] = useState(() => rangoUltimos12Meses())

  const rango = useMemo(() => {
    if (preset === 'trimestre') return rangoTrimestreActual()
    if (preset === 'anio') return rangoDelAnio(anio)
    if (preset === '12m') return rangoUltimos12Meses()
    if (preset === 'personalizado') return personalizado
    return rangoDelMes(mes)
  }, [preset, mes, anio, personalizado])

  const nombrePeriodo =
    preset === 'mes' ? nombreMes(mes)
      : preset === 'anio' ? String(anio)
        : preset === 'trimestre' ? 'el trimestre'
          : preset === '12m' ? 'los últimos 12 meses'
            : 'el periodo'

  return {
    preset, setPreset, mes, setMes, anio, setAnio, personalizado, setPersonalizado, rango, nombrePeriodo,
  }
}
