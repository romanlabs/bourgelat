// Tests de las reglas de los recordatorios de cobro. Se ejecutan con
// `node src/services/recordatoriosCobroReglas.test.js` (integrados en `npm test`).
const assert = require('assert')
const { sumarDiasISO } = require('../utils/vencimiento')
const {
  TOPE_POR_EJECUCION, TIPOS, diasHasta, clasificarRecordatorio, preciosRecordatorio,
  normalizarCelular, enlaceWhatsapp, cabeEnTope,
} = require('./recordatoriosCobroReglas')

assert.strictEqual(TOPE_POR_EJECUCION, 30)
assert.deepStrictEqual(TIPOS, ['vence_pronto', 'vence_manana', 'vencida'])

// diasHasta
assert.strictEqual(diasHasta('2026-10-29', '2026-10-26'), 3)
assert.strictEqual(diasHasta('2026-10-26', '2026-10-26'), 0)
assert.strictEqual(diasHasta('2026-10-23', '2026-10-26'), -3)
assert.strictEqual(diasHasta('2026-11-02', '2026-10-26'), 7)

const hoy = '2026-10-26'
const base = { plan: 'activo', estado: 'activa', fechaInicio: '2026-09-26', precio: '120000.00' }
const fin = (d) => sumarDiasISO(hoy, d)
const c = (extra) => clasificarRecordatorio({ suscripcion: { ...base, ...extra }, hoy })

assert.strictEqual(c({ fechaFin: fin(8) }), null)
assert.deepStrictEqual(c({ fechaFin: fin(7) }), { tipo: 'vence_pronto', dias: 7 })
assert.deepStrictEqual(c({ fechaFin: fin(2) }), { tipo: 'vence_pronto', dias: 2 })
assert.deepStrictEqual(c({ fechaFin: fin(1) }), { tipo: 'vence_manana', dias: 1 })
assert.deepStrictEqual(c({ fechaFin: fin(0) }), { tipo: 'vence_manana', dias: 0 })
assert.deepStrictEqual(c({ fechaFin: fin(-1) }), { tipo: 'vencida', dias: -1 })
assert.deepStrictEqual(c({ fechaFin: fin(-3) }), { tipo: 'vencida', dias: -3 })
assert.strictEqual(c({ fechaFin: fin(-4) }), null)
assert.deepStrictEqual(c({ fechaFin: fin(-2), estado: 'solo_lectura' }), { tipo: 'vencida', dias: -2 })
assert.strictEqual(c({ fechaFin: fin(3), estado: 'solo_lectura' }), null)
assert.strictEqual(c({ fechaFin: fin(3), estado: 'cancelada' }), null)
assert.strictEqual(c({ fechaFin: fin(-1), estado: 'vencida' }), null)
assert.deepStrictEqual(c({ fechaFin: fin(5), estado: 'prueba', plan: 'prueba', precio: 0 }), { tipo: 'vence_pronto', dias: 5 })
// excluidas
assert.strictEqual(c({ fechaFin: fin(3), plan: 'cortesia' }), null)
assert.strictEqual(c({ fechaFin: '2099-12-31' }), null)
assert.strictEqual(c({ fechaFin: fin(3), plan: 'personalizado', precio: '0.00' }), null)
assert.deepStrictEqual(c({ fechaFin: fin(3), plan: 'personalizado', precio: '150000' }), { tipo: 'vence_pronto', dias: 3 })
// fila de solo lectura creada al vuelo (inicio = fin)
assert.strictEqual(c({ fechaFin: fin(-1), fechaInicio: fin(-1), estado: 'solo_lectura', precio: 0 }), null)
// otra suscripción vigente
assert.strictEqual(clasificarRecordatorio({ suscripcion: { ...base, fechaFin: fin(3) }, hoy, tieneOtraVigente: true }), null)
assert.strictEqual(clasificarRecordatorio({ suscripcion: { ...base, fechaFin: fin(-1) }, hoy, tieneOtraVigente: true }), null)

// precios
assert.deepStrictEqual(preciosRecordatorio({ plan: 'activo', precio: '120000.00' }), [{ nombre: 'Clínica', precioMensual: 120000 }])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'prueba', precio: 0 }).map((p) => p.precioMensual), [89000, 120000])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'prueba', precio: '49000' }), [{ nombre: 'Tu plan', precioMensual: 49000 }])
assert.deepStrictEqual(preciosRecordatorio({ plan: 'esencial', precio: 0 }), [{ nombre: 'Esencial', precioMensual: 89000 }])

// celular y wa.me
assert.strictEqual(normalizarCelular('300 123 4567'), '573001234567')
assert.strictEqual(normalizarCelular('+57 300-123-4567'), '573001234567')
assert.strictEqual(normalizarCelular('573001234567'), '573001234567')
assert.strictEqual(normalizarCelular('6012345678'), null)
assert.strictEqual(normalizarCelular('1234567'), null)
assert.strictEqual(normalizarCelular(''), null)
assert.strictEqual(normalizarCelular(null), null)
assert.strictEqual(normalizarCelular('+52 55 1234 5678'), '525512345678')
const wa = enlaceWhatsapp({ telefono: '3001234567', nombreClinica: 'Pegatos & Co', urlPagar: 'https://app.bourgelat.co/pagar' })
assert.ok(wa.startsWith('https://wa.me/573001234567?text='))
assert.ok(decodeURIComponent(wa.split('text=')[1]).includes('Pegatos & Co'))
assert.ok(decodeURIComponent(wa.split('text=')[1]).includes('https://app.bourgelat.co/pagar'))
assert.strictEqual(enlaceWhatsapp({ telefono: null, nombreClinica: 'X', urlPagar: 'u' }), null)

// tope
assert.strictEqual(cabeEnTope({ enviados: 28, destinatarios: 2 }), true)
assert.strictEqual(cabeEnTope({ enviados: 29, destinatarios: 2 }), false)
assert.strictEqual(cabeEnTope({ enviados: 0, destinatarios: 31 }), false)

console.log('recordatoriosCobroReglas.test.js: todos los tests pasaron ✔')
