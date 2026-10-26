// Tests de las plantillas del recordatorio de cobro y del resumen a soporte.
const assert = require('assert')
const { armarEmailRecordatorioCobro, armarEmailResumenCobro } = require('./emailService')

const base = { nombre: 'Ana', clinica: 'Pegatos <b>', fechaFin: '2026-11-02', urlPagar: 'https://app.bourgelat.co/pagar', urlFrontend: 'https://app.bourgelat.co' }
const pronto = armarEmailRecordatorioCobro({ ...base, tipo: 'vence_pronto', dias: 7, esPrueba: true, precios: [{ nombre: 'Esencial', precioMensual: 89000 }, { nombre: 'Clínica', precioMensual: 120000 }] })
assert.strictEqual(pronto.asunto, 'Tu prueba de Bourgelat vence en 7 días')
assert.ok(pronto.html.includes('Pegatos &lt;b&gt;'))
assert.ok(!pronto.html.includes('Pegatos <b>'))
assert.ok(pronto.html.includes('$89.000') && pronto.html.includes('$120.000'))
assert.ok(pronto.html.includes('2 de noviembre de 2026'))
assert.ok(pronto.html.includes('Pagar ahora'))
assert.ok(pronto.html.includes('Activamos tu plan el mismo día hábil en que recibimos el pago.'))
assert.ok(pronto.texto.includes('https://app.bourgelat.co/pagar'))
assert.ok(pronto.texto.includes('Esencial: $89.000 al mes'))
assert.ok(pronto.html.includes('/terminos'))
assert.ok(!/DIAN/i.test(pronto.html))
assert.ok(!pronto.texto.includes('exportarlos'))

assert.strictEqual(armarEmailRecordatorioCobro({ ...base, tipo: 'vence_manana', dias: 1, esPrueba: false, precios: [] }).asunto, 'Tu plan de Bourgelat vence mañana')
assert.strictEqual(armarEmailRecordatorioCobro({ ...base, tipo: 'vence_manana', dias: 0, esPrueba: false, precios: [] }).asunto, 'Tu plan de Bourgelat vence hoy')
const vencida = armarEmailRecordatorioCobro({ ...base, tipo: 'vencida', dias: -1, esPrueba: false, precios: [] })
assert.strictEqual(vencida.asunto, 'Tu cuenta de Bourgelat quedó en solo lectura')
assert.ok(vencida.texto.includes('exportarlos'))
assert.ok(!/al mes/.test(vencida.html)) // sin precios no hay líneas de precio

const resumen = armarEmailResumenCobro({ fecha: '2026-10-26', filas: [
  { clinica: 'A & B', tipo: 'vence_pronto', fechaFin: '2026-11-02', correos: ['a@x.co'], telefono: '3001234567', enlaceWhatsapp: 'https://wa.me/573001234567?text=hola' },
  { clinica: 'C', tipo: 'vencida', fechaFin: '2026-10-25', correos: ['c@x.co'], telefono: null, enlaceWhatsapp: null },
] })
assert.strictEqual(resumen.asunto, 'Recordatorios de cobro enviados (2)')
assert.ok(resumen.html.includes('A &amp; B'))
assert.strictEqual(resumen.html.split('Enviar WhatsApp').length - 1, 1)
assert.ok(resumen.texto.includes('A & B'))

console.log('emailRecordatorioCobro.test.js: todos los tests pasaron ✔')
