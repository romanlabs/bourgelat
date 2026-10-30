// Reglas puras de las notificaciones guardadas (campanita, Fase B): qué dice
// cada aviso y a dónde lleva. Sin base de datos, para poder probarlas solas.

const CATEGORIAS = ['clinica', 'inventario', 'caja', 'sistema']

// Cuántos días se guarda un aviso: la campanita es lo reciente, no un archivo.
const DIAS_RETENCION = 60

// Lo que no puede esperar: además de la campanita, va por correo a quien lo
// pidió en sus ajustes y sale arriba, en «Para revisar ahora».
const TIPOS_URGENTES = ['turno_descuadre', 'turno_sin_cerrar']

// Avisos de una cita que dejan de servir cuando la cita avanza (ya se atiende,
// se canceló o no vino): se marcan leídos solos.
const TIPOS_DE_CITA = ['paciente_llego', 'cita_proxima', 'cita_agendada', 'cita_movida']

const recortar = (texto, max) => {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim()
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio
}

const pesos = (valor) =>
  `$${Math.round(Math.abs(Number(valor) || 0)).toLocaleString('es-CO')}`

// «11:20» → «11:20 a. m.» (como en la app).
const hora12 = (hora) => {
  const [h, m] = String(hora || '').split(':').map(Number)
  if (!hora || !Number.isFinite(h) || !Number.isFinite(m)) return ''
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

// «2026-10-30» → «vie, 30 oct» (las fechas de cita son DATEONLY, sin zona).
const fechaCorta = (fecha) => {
  if (!fecha) return ''
  const dia = new Date(`${String(fecha).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(dia.getTime())) return ''
  return dia.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
}

const armar = ({ categoria, tipo, titulo, texto, enlace, entidadTipo, entidadId }) => ({
  categoria,
  tipo,
  titulo: recortar(titulo, 160),
  texto: texto ? recortar(texto, 400) : null,
  enlace: enlace || null,
  entidadTipo: entidadTipo || null,
  entidadId: entidadId || null,
})

// Recepción marcó la llegada: el veterinario de la cita sabe que ya está en sala.
const avisoPacienteLlego = ({ cita, mascotaNombre, propietarioNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'paciente_llego',
    titulo: `${mascotaNombre || 'Tu paciente'} llegó a sala`,
    texto: [
      cita.horaInicio ? `Cita de las ${hora12(cita.horaInicio)}` : null,
      propietarioNombre ? `con ${propietarioNombre}` : null,
    ].filter(Boolean).join(' ') + (cita.motivo ? `. ${cita.motivo}` : '.'),
    // Recepción abre la cita en la sala de espera y la resalta.
    enlace: `/agenda?tab=recepcion&cita=${cita.id}`,
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

// Llegaron resultados: avisa al veterinario que lleva al paciente.
const avisoExamenRegistrado = ({ examen, mascotaId, mascotaNombre, registradoPorNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'examen_registrado',
    titulo: `Llegaron los resultados de ${mascotaNombre || 'tu paciente'}`,
    texto: `${examen.tipo}${examen.interpretacion ? `: ${examen.interpretacion}` : ''}${registradoPorNombre ? `. Lo registró ${registradoPorNombre}.` : '.'}`,
    enlace: `/pacientes/${mascotaId}/historial`,
    entidadTipo: 'ExamenLaboratorio',
    entidadId: examen.id,
  })

// Cierre de turno para los administradores: lo que importa es si cuadró.
const avisoTurnoCerrado = ({ turno, cajeroNombre }) => {
  const diferencia = Number(turno.diferencia) || 0
  const quien = cajeroNombre || 'Alguien del equipo'
  return armar({
    categoria: 'caja',
    // Con descuadre es urgente: el administrador debe revisarlo.
    tipo: diferencia === 0 ? 'turno_cerrado' : 'turno_descuadre',
    titulo: diferencia === 0
      ? `${quien} cerró el turno sin descuadre`
      : `${quien} cerró el turno con ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${pesos(diferencia)}`,
    texto: `Se contaron ${pesos(turno.montoFinalContado)} en efectivo${diferencia === 0 ? '.' : `; se esperaban ${pesos(turno.montoFinalEsperado)}.`}`,
    enlace: '/caja',
    entidadTipo: 'CajaTurno',
    entidadId: turno.id,
  })
}

// El mismo recordatorio que sale por correo al profesional, dentro de la app.
const avisoCitaProxima = ({ cita, mascotaNombre, propietarioNombre, consultorioNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'cita_proxima',
    titulo: `Próxima cita: ${mascotaNombre || 'un paciente'} a las ${hora12(cita.horaInicio)}`,
    texto: [
      propietarioNombre ? `Tutor: ${propietarioNombre}` : null,
      consultorioNombre ? `en ${consultorioNombre}` : null,
      cita.motivo || null,
    ].filter(Boolean).join(' · ') || null,
    // Recepción abre la cita en la sala de espera y la resalta.
    enlace: `/agenda?tab=recepcion&cita=${cita.id}`,
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

// Cambios de agenda que hizo otra persona sobre las citas del veterinario.
const enlaceCita = (cita) => `/agenda?tab=recepcion&cita=${cita.id}`
const cuandoCita = (cita) => `${fechaCorta(cita.fecha)} a las ${hora12(cita.horaInicio)}`

const avisoCitaAgendada = ({ cita, mascotaNombre, actorNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'cita_agendada',
    titulo: `Te agendaron a ${mascotaNombre || 'un paciente'} el ${cuandoCita(cita)}`,
    texto: [cita.motivo, actorNombre ? `La agendó ${actorNombre}.` : null].filter(Boolean).join('. ') || null,
    enlace: enlaceCita(cita),
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

const avisoCitaMovida = ({ cita, anterior, mascotaNombre, actorNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'cita_movida',
    titulo: `La cita de ${mascotaNombre || 'tu paciente'} pasó al ${cuandoCita(cita)}`,
    texto: `Estaba para el ${cuandoCita(anterior)}${actorNombre ? `; la movió ${actorNombre}.` : ''}`,
    enlace: enlaceCita(cita),
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

const avisoCitaCancelada = ({ cita, mascotaNombre, actorNombre }) =>
  armar({
    categoria: 'clinica',
    tipo: 'cita_cancelada',
    titulo: `Se canceló la cita de ${mascotaNombre || 'tu paciente'} del ${cuandoCita(cita)}`,
    texto: [cita.motivoCancelacion ? `Motivo: ${cita.motivoCancelacion}` : null, actorNombre ? `La canceló ${actorNombre}.` : null]
      .filter(Boolean).join('. ') || null,
    enlace: '/agenda',
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

// Turno de caja de un día anterior que nadie cerró: el efectivo no cuadra
// hasta que se cuente.
const avisoTurnoSinCerrar = ({ turno, cajeroNombre, propia = false }) => {
  const apertura = new Date(turno.fechaApertura)
  const dia = apertura.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  return armar({
    categoria: 'caja',
    tipo: 'turno_sin_cerrar',
    titulo: propia
      ? `Tu caja sigue abierta desde el ${dia}`
      : `La caja de ${cajeroNombre || 'alguien del equipo'} sigue abierta desde el ${dia}`,
    texto: 'Ciérrala contando el efectivo para que el turno cuadre.',
    enlace: '/caja',
    entidadTipo: 'CajaTurno',
    entidadId: turno.id,
  })
}

module.exports = {
  CATEGORIAS,
  DIAS_RETENCION,
  TIPOS_URGENTES,
  TIPOS_DE_CITA,
  hora12,
  fechaCorta,
  avisoCitaAgendada,
  avisoCitaMovida,
  avisoCitaCancelada,
  avisoTurnoSinCerrar,
  avisoPacienteLlego,
  avisoExamenRegistrado,
  avisoTurnoCerrado,
  avisoCitaProxima,
}
