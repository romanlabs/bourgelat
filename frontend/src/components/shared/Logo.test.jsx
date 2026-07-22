import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Logo from './Logo'

describe('Logo', () => {
  it('renderiza el wordmark Bourgelat', () => {
    render(<Logo />)
    expect(screen.getByText('Bourgelat')).toBeInTheDocument()
  })
})
