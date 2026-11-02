import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ default: { post: vi.fn(() => Promise.resolve()) } }))
vi.mock('@/store/authStore', () => ({ useAuthStore: { getState: vi.fn() } }))

import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { reportarErrorDePantalla } from './reportarError'

describe('reportarErrorDePantalla', () => {
  beforeEach(() => {
    api.post.mockClear()
    useAuthStore.getState.mockReturnValue({ isAuthenticated: true })
  })

  it('reporta una sola vez el mismo error', () => {
    reportarErrorDePantalla(new Error('x is not a function'))
    reportarErrorDePantalla(new Error('x is not a function'))
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post.mock.calls[0][1].mensaje).toBe('x is not a function')
  })

  it('sin sesión no reporta', () => {
    useAuthStore.getState.mockReturnValue({ isAuthenticated: false })
    reportarErrorDePantalla(new Error('sin sesion'))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('ignora módulos viejos tras publicar y rutas inexistentes', () => {
    reportarErrorDePantalla(new Error('Failed to fetch dynamically imported module: /a.js'))
    reportarErrorDePantalla({ status: 404, statusText: 'Not Found' })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('un fallo al reportar no se propaga', () => {
    api.post.mockImplementationOnce(() => {
      throw new Error('red')
    })
    expect(() => reportarErrorDePantalla(new Error('otro error'))).not.toThrow()
  })
})
