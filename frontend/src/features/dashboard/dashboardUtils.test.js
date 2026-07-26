import { describe, it, expect } from 'vitest'
import { mapIngresosPorDia } from './dashboardUtils'

// El backend entrega ingresosPorDia como un record cuya clave es Factura.fecha,
// que es DATEONLY y por lo tanto llega como 'YYYY-MM-DD'.
const ingresosPorDia = {
  '2026-07-17': 116000,
  '2026-07-18': 34000,
}

describe('mapIngresosPorDia', () => {
  it('conserva la clave original en fechaISO', () => {
    expect(mapIngresosPorDia(ingresosPorDia).map((item) => item.fechaISO)).toEqual([
      '2026-07-17',
      '2026-07-18',
    ])
  })

  it('permite buscar un dia puntual por su fecha ISO', () => {
    // Regresion: antes solo existia `fecha` ya formateada ("18 jul"), asi que
    // comparar contra 'YYYY-MM-DD' nunca coincidia y el KPI "Ingresos de hoy"
    // quedaba siempre en cero.
    const filas = mapIngresosPorDia(ingresosPorDia)
    expect(filas.find((item) => item.fechaISO === '2026-07-18')?.total).toBe(34000)
  })

  it('deja `fecha` como etiqueta legible para el eje X de la grafica', () => {
    const [primera] = mapIngresosPorDia(ingresosPorDia)
    expect(primera.fecha).not.toBe(primera.fechaISO)
    expect(primera.fecha).toMatch(/jul/i)
  })

  it('devuelve una lista vacia cuando no hay datos', () => {
    expect(mapIngresosPorDia(undefined)).toEqual([])
  })
})
