// Tests del token de onboarding OAuth. Se ejecutan con
// `node src/services/oauthService.test.js` (integrados en `npm test`).

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-test-32-caracteres-minimo!!'

const assert = require('assert')
const jwt = require('jsonwebtoken')
const { generarTokenOnboarding, verificarTokenOnboarding } = require('./oauthService')

// Genera y verifica un token valido
const token = generarTokenOnboarding({ email: 'a@b.com', nombre: 'Ana', proveedor: 'google', proveedorId: 'sub123' })
const payload = verificarTokenOnboarding(token)
assert.strictEqual(payload.email, 'a@b.com', 'debe conservar el email')
assert.strictEqual(payload.proposito, 'oauth_onboarding', 'debe marcar el proposito de onboarding')

// Rechaza un JWT con otro proposito
const ajeno = jwt.sign({ email: 'a@b.com' }, process.env.JWT_SECRET)
assert.throws(() => verificarTokenOnboarding(ajeno), 'debe rechazar un token sin proposito de onboarding')

console.log('oauthService.test.js: todos los tests pasaron ✔')
