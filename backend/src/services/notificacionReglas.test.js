// Tests de los textos de las notificaciones guardadas. Se ejecutan con
// `node src/services/notificacionReglas.test.js` (integrado en `npm test`).
// No requieren base de datos.

const assert = require('assert')
const {
  hora12,
  avisoPacienteLlego,
  avisoExamenRegistrado,
  avisoTurnoCerrado,
  avisoCitaProxima,
  avisoCitaAgendada,
  avisoCitaMovida,
  avisoCitaCancelada,
  avisoTurnoSinCerrar,
  fechaCorta,
  TIPOS_URGENTES,
  TIPOS_DE_CITA,
} = require('./notificacionReglas')

assert.strictEqual(hora12('11:20:00'), '11:20 a. m.')
assert.strictEqual(hora12('12:05'), '12:05 p. m.')
assert.strictEqual(hora12('00:30'), '12:30 a. m.')
assert.strictEqual(hora12(null), '')

const llegada = avisoPacienteLlego({
  cita: { id: 'c1', horaInicio: '11:00:00', motivo: 'Cojea de la pata trasera' },
  mascotaNombre: 'Oreo',
  propietarioNombre: 'Carlos Mejía',
})
assert.deepStrictEqual(llegada, {
  categoria: 'clinica',
  tipo: 'paciente_llego',
  titulo: 'Oreo llegó a sala',
  texto: 'Cita de las 11:00 a. m. con Carlos Mejía. Cojea de la pata trasera',
  enlace: '/agenda?tab=recepcion&cita=c1',
  entidadTipo: 'Cita',
  entidadId: 'c1',
})

const examen = avisoExamenRegistrado({
  examen: { id: 'e1', tipo: 'Hemograma', interpretacion: 'Leucocitos altos' },
  mascotaId: 'm1',
  mascotaNombre: 'Simón',
  registradoPorNombre: 'Ana',
})
assert.strictEqual(examen.titulo, 'Llegaron los resultados de Simón')
assert.strictEqual(examen.texto, 'Hemograma: Leucocitos altos. Lo registró Ana.')
assert.strictEqual(examen.enlace, '/pacientes/m1/historial')

const cuadrado = avisoTurnoCerrado({
  turno: { id: 't1', diferencia: '0.00', montoFinalContado: '598000', montoFinalEsperado: '598000' },
  cajeroNombre: 'Diana Ruiz',
})
assert.strictEqual(cuadrado.titulo, 'Diana Ruiz cerró el turno sin descuadre')
assert.strictEqual(cuadrado.texto, 'Se contaron $598.000 en efectivo.')

const faltante = avisoTurnoCerrado({
  turno: { id: 't2', diferencia: '-12000', montoFinalContado: '88000', montoFinalEsperado: '100000' },
  cajeroNombre: 'Diana Ruiz',
})
assert.strictEqual(faltante.titulo, 'Diana Ruiz cerró el turno con faltante de $12.000')
assert.strictEqual(faltante.texto, 'Se contaron $88.000 en efectivo; se esperaban $100.000.')
// Cuadrado es informativo; con descuadre es urgente.
assert.strictEqual(cuadrado.tipo, 'turno_cerrado')
assert.strictEqual(faltante.tipo, 'turno_descuadre')
assert.ok(TIPOS_URGENTES.includes(faltante.tipo))

// Cambios de agenda que hizo otra persona.
const cita = { id: 'c3', fecha: '2026-10-30', horaInicio: '09:00:00', motivo: 'Control', motivoCancelacion: 'Viaje' }
assert.strictEqual(fechaCorta('2026-10-30'), 'vie, 30 de oct')
const agendada = avisoCitaAgendada({ cita, mascotaNombre: 'Toby', actorNombre: 'Laura' })
assert.strictEqual(agendada.titulo, 'Te agendaron a Toby el vie, 30 de oct a las 9:00 a. m.')
assert.strictEqual(agendada.texto, 'Control. La agendó Laura.')
assert.strictEqual(agendada.enlace, '/agenda?tab=recepcion&cita=c3')
const movida = avisoCitaMovida({ cita, anterior: { fecha: '2026-10-29', horaInicio: '16:00' }, mascotaNombre: 'Toby' })
assert.strictEqual(movida.titulo, 'La cita de Toby pasó al vie, 30 de oct a las 9:00 a. m.')
assert.strictEqual(movida.texto, 'Estaba para el jue, 29 de oct a las 4:00 p. m.')
const cancelada = avisoCitaCancelada({ cita, mascotaNombre: 'Toby', actorNombre: 'Laura' })
assert.strictEqual(cancelada.texto, 'Motivo: Viaje. La canceló Laura.')
assert.ok(!TIPOS_DE_CITA.includes(cancelada.tipo))

const sinCerrar = avisoTurnoSinCerrar({ turno: { id: 't3', fechaApertura: new Date(2026, 9, 28, 8) }, cajeroNombre: 'Diana' })
assert.strictEqual(sinCerrar.titulo, 'La caja de Diana sigue abierta desde el miércoles, 28 de octubre')
assert.ok(TIPOS_URGENTES.includes(sinCerrar.tipo))
assert.strictEqual(
  avisoTurnoSinCerrar({ turno: { id: 't3', fechaApertura: new Date(2026, 9, 28, 8) }, propia: true }).titulo,
  'Tu caja sigue abierta desde el miércoles, 28 de octubre'
)

const proxima = avisoCitaProxima({
  cita: { id: 'c2', horaInicio: '15:30:00', motivo: 'Vacunación' },
  mascotaNombre: 'Lupe',
  propietarioNombre: 'Beatriz',
  consultorioNombre: 'Consultorio 1',
})
assert.strictEqual(proxima.titulo, 'Próxima cita: Lupe a las 3:30 p. m.')
assert.strictEqual(proxima.texto, 'Tutor: Beatriz · en Consultorio 1 · Vacunación')

// Los textos largos se recortan a lo que cabe en la columna.
const largo = avisoExamenRegistrado({
  examen: { id: 'e2', tipo: 'Perfil', interpretacion: 'x'.repeat(600) },
  mascotaId: 'm1',
})
assert.strictEqual(largo.texto.length, 400)
assert.ok(largo.texto.endsWith('…'))

console.log('notificacionReglas: OK')
