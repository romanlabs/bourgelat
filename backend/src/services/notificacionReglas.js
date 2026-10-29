// Reglas puras de las notificaciones guardadas (campanita, Fase B): qué dice
// cada aviso y a dónde lleva. Sin base de datos, para poder probarlas solas.

const CATEGORIAS = ['clinica', 'inventario', 'caja', 'sistema']

// Cuántos días se guarda un aviso: la campanita es lo reciente, no un archivo.
const DIAS_RETENCION = 60

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
    enlace: '/agenda',
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
    tipo: 'turno_cerrado',
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
    enlace: '/agenda',
    entidadTipo: 'Cita',
    entidadId: cita.id,
  })

module.exports = {
  CATEGORIAS,
  DIAS_RETENCION,
  hora12,
  avisoPacienteLlego,
  avisoExamenRegistrado,
  avisoTurnoCerrado,
  avisoCitaProxima,
}
