// Tests de la plantilla del recordatorio de cita.
const assert = require('assert')
const { armarEmailRecordatorioCita } = require('./emailService')

const datos = {
  asunto: 'Cita a las 10:00 a. m.: <b>Luna</b> & Co (consulta general)',
  hora: '10:00 a. m.', fechaISO: '2026-10-17',
  paciente: '<script>x</script>', especie: 'Perro',
  tutor: 'Ana & Juan', celularTutor: '3001234567',
  motivo: 'Vacuna', tipo: 'consulta general', consultorio: null,
  urlAgenda: 'https://app.bourgelat.co/agenda?fecha=2026-10-17',
}
const correo = armarEmailRecordatorioCita({ nombreProfesional: 'Dra. Indira', datos })

assert.strictEqual(correo.asunto, datos.asunto) // el asunto es texto plano, no HTML
assert.ok(!correo.html.includes('<script>'))
assert.ok(correo.html.includes('&lt;script&gt;'))
assert.ok(correo.html.includes('Ana &amp; Juan'))
assert.ok(correo.html.includes('https://app.bourgelat.co/agenda?fecha=2026-10-17'))
assert.ok(!correo.html.includes('Consultorio')) // sin consultorio no hay fila
assert.ok(correo.texto.includes('3001234567'))

console.log('emailRecordatorioCita.test.js: todos los tests pasaron ✔')
