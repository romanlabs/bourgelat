// Tests de las reglas del recordatorio de cita. Se ejecutan con
// `node src/services/recordatorioCitaReglas.test.js` (integrados en `npm test`).
const assert = require('assert')
const {
  MINUTOS_MIN, MINUTOS_MAX, minutosValidos, inicioCita, debeAvisar,
  inicioDelDia, horaTexto, datosCorreo,
} = require('./recordatorioCitaReglas')

// Rango
assert.strictEqual(MINUTOS_MIN, 15)
assert.strictEqual(MINUTOS_MAX, 2880)
assert.strictEqual(minutosValidos(15), true)
assert.strictEqual(minutosValidos(2880), true)
assert.strictEqual(minutosValidos(14), false)
assert.strictEqual(minutosValidos(2881), false)
assert.strictEqual(minutosValidos(90.5), false)
assert.strictEqual(minutosValidos('60'), false)

// Inicio en hora de Colombia (UTC-5), acepta TIME de Postgres con segundos
assert.strictEqual(inicioCita({ fecha: '2026-10-17', horaInicio: '10:00' }).toISOString(), '2026-10-17T15:00:00.000Z')
assert.strictEqual(inicioCita({ fecha: '2026-10-17', horaInicio: '00:15:00' }).toISOString(), '2026-10-17T05:15:00.000Z')
assert.strictEqual(inicioDelDia('2026-10-17').toISOString(), '2026-10-17T05:00:00.000Z')

// Ventana: inicio 10:00, 60 min
const inicio = inicioCita({ fecha: '2026-10-17', horaInicio: '10:00' })
const a = (hhmm) => new Date(`2026-10-17T${hhmm}:00-05:00`)
assert.strictEqual(debeAvisar({ inicio, ahora: a('08:59'), minutos: 60 }), false) // antes
assert.strictEqual(debeAvisar({ inicio, ahora: a('09:00'), minutos: 60 }), true)  // borde
assert.strictEqual(debeAvisar({ inicio, ahora: a('09:50'), minutos: 60 }), true)  // ventana tardía: agendada hace poco
assert.strictEqual(debeAvisar({ inicio, ahora: a('10:00'), minutos: 60 }), false) // ya empezó
assert.strictEqual(debeAvisar({ inicio, ahora: a('11:00'), minutos: 60 }), false)

// Hora legible
assert.strictEqual(horaTexto('10:00:00'), '10:00 a. m.')
assert.strictEqual(horaTexto('12:30'), '12:30 p. m.')
assert.strictEqual(horaTexto('00:15'), '12:15 a. m.')
assert.strictEqual(horaTexto('15:05'), '3:05 p. m.')

// Contenido: solo datos de agenda, nada clínico
const datos = datosCorreo({
  cita: { fecha: '2026-10-17', horaInicio: '10:00:00', motivo: 'Vacuna', tipoCita: 'consulta_general', observaciones: 'NO DEBE SALIR' },
  mascota: { nombre: 'Luna', especie: 'perro' },
  propietario: { nombre: 'Ana Pérez', telefono: '3001234567' },
  consultorio: { nombre: 'Consultorio 1' },
  urlFrontend: 'https://app.bourgelat.co',
})
assert.strictEqual(datos.asunto, 'Cita a las 10:00 a. m.: Luna (consulta general)')
assert.strictEqual(datos.tipo, 'consulta general')
assert.strictEqual(datos.especie, 'Perro')
assert.strictEqual(datos.consultorio, 'Consultorio 1')
assert.strictEqual(datos.urlAgenda, 'https://app.bourgelat.co/agenda?fecha=2026-10-17')
// El celular se guarda en E.164; en el correo va legible, como en la app
assert.strictEqual(datos.celularTutor, '300 1234567')
assert.strictEqual(
  datosCorreo({ ...{ cita: { fecha: '2026-10-17', horaInicio: '10:00', tipoCita: 'control' }, mascota: { nombre: 'Rex', especie: 'perro' }, consultorio: null, urlFrontend: '' }, propietario: { nombre: 'Tom', telefono: '+14155552671' } }).celularTutor,
  '+1 415 555 2671'
)
assert.ok(!JSON.stringify(datos).includes('NO DEBE SALIR'))

// Sin consultorio ni teléfono
const sinExtras = datosCorreo({
  cita: { fecha: '2026-10-17', horaInicio: '08:00', motivo: 'Control', tipoCita: 'control' },
  mascota: { nombre: 'Michi', especie: 'gato' },
  propietario: { nombre: 'Luis', telefono: null },
  consultorio: null,
  urlFrontend: 'https://app.bourgelat.co',
})
assert.strictEqual(sinExtras.consultorio, null)
assert.strictEqual(sinExtras.celularTutor, null)

console.log('recordatorioCitaReglas.test.js: todos los tests pasaron ✔')
