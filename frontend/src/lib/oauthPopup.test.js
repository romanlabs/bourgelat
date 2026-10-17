import { describe, expect, it } from 'vitest'
import { esOrigenOauthValido, origenesDestinoOauth } from './oauthPopup'

describe('oauthPopup', () => {
  it('el popup en app.bourgelat.co avisa también a la pestaña en bourgelat.co', () => {
    expect(origenesDestinoOauth('https://app.bourgelat.co')).toContain('https://bourgelat.co')
  })

  it('en local avisa al propio origen', () => {
    expect(origenesDestinoOauth('http://localhost:5173')[0]).toBe('http://localhost:5173')
  })

  it('la pestaña en bourgelat.co acepta el aviso de app.bourgelat.co', () => {
    expect(esOrigenOauthValido('https://app.bourgelat.co', 'https://bourgelat.co')).toBe(true)
  })

  it('rechaza avisos de orígenes ajenos', () => {
    expect(esOrigenOauthValido('https://evil.example', 'https://bourgelat.co')).toBe(false)
    expect(esOrigenOauthValido('https://app.bourgelat.co.evil.example', 'https://bourgelat.co')).toBe(false)
  })
})
