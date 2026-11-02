import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { TutorPetSelector } from './TutorPetSelector'

vi.mock('./useRecepcion', () => ({
  useBuscarPropietarios: () => ({ data: { propietarios: [] } }),
}))

function montar(rol) {
  useAuthStore.setState({ usuario: { id: 'u1', rol, rolesAdicionales: [] } })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TutorPetSelector
          ownerSearch="alguien que no existe"
          onOwnerSearchChange={() => {}}
          selectedOwner={null}
          onSelectOwner={() => {}}
          mascotas={[]}
          mascotaId=""
          onSelectMascota={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TutorPetSelector: crear tutor según el rol', () => {
  afterEach(() => useAuthStore.setState({ usuario: null }))

  it.each(['admin', 'recepcionista', 'auxiliar'])('%s puede crear el tutor', (rol) => {
    montar(rol)
    expect(screen.getByRole('button', { name: 'Crear tutor' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crearlo ahora' })).toBeTruthy()
  })

  it('veterinario no ve la opción y se le indica pedirlo a recepción', () => {
    montar('veterinario')
    expect(screen.queryByRole('button', { name: 'Crear tutor' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Crearlo ahora' })).toBeNull()
    expect(screen.getByText(/Pide a recepción que lo registre/)).toBeTruthy()
  })
})
