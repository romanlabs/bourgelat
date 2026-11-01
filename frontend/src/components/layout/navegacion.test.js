import { describe, expect, it } from 'vitest'
import { pestanasMovil } from './navegacion'

describe('pestanasMovil', () => {
  it('admin ve Hoy, Agenda, Pacientes y Caja', () => {
    expect(pestanasMovil({ rol: 'admin' })).toEqual(['dashboard', 'agenda', 'pacientes', 'caja'])
  })

  it('veterinario cambia Caja por Historias', () => {
    expect(pestanasMovil({ rol: 'veterinario' })).toEqual(['dashboard', 'agenda', 'pacientes', 'historias'])
  })

  it('facturador solo ve lo que puede abrir', () => {
    expect(pestanasMovil({ rol: 'facturador' })).toEqual(['dashboard', 'caja', 'finanzas'])
  })

  it('con varios roles usa el principal', () => {
    expect(pestanasMovil({ rol: 'auxiliar', rolesAdicionales: ['admin'] })).toEqual([
      'dashboard',
      'agenda',
      'pacientes',
      'inventario',
    ])
  })

  it('sin usuario deja solo Hoy', () => {
    expect(pestanasMovil(null)).toEqual(['dashboard'])
  })
})
