// Reglas puras del recordatorio de cita al profesional (sin base de datos ni
// correo): cuándo avisar, rango de anticipación y datos del correo.
// Colombia no tiene horario de verano: el desfase -05:00 es fijo.

const { formatearCelular } = require('../utils/normalizar')

const MINUTOS_MIN = 15
const MINUTOS_MAX = 2880
const TOPE_DIARIO = 150
const DESFASE_COLOMBIA = '-05:00'

const minutosValidos = (n) => Number.isInteger(n) && n >= MINUTOS_MIN && n <= MINUTOS_MAX

const hhmm = (hora) => String(hora).slice(0, 5)

const inicioCita = ({ fecha, horaInicio }) => new Date(`${fecha}T${hhmm(horaInicio)}:00${DESFASE_COLOMBIA}`)

const inicioDelDia = (fechaISO) => new Date(`${fechaISO}T00:00:00${DESFASE_COLOMBIA}`)

const debeAvisar = ({ inicio, ahora, minutos }) =>
  ahora.getTime() >= inicio.getTime() - minutos * 60 * 1000 && ahora.getTime() < inicio.getTime()

const horaTexto = (hora) => {
  const [h, m] = hhmm(hora).split(':').map(Number)
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`
}

const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '')

const datosCorreo = ({ cita, mascota, propietario, consultorio, urlFrontend }) => {
  const hora = horaTexto(cita.horaInicio)
  const tipo = String(cita.tipoCita || '').replace(/_/g, ' ')
  return {
    asunto: `Cita a las ${hora}: ${mascota.nombre} (${tipo})`,
    hora,
    fechaISO: cita.fecha,
    paciente: mascota.nombre,
    especie: capitalizar(mascota.especie),
    tutor: propietario?.nombre || '',
    celularTutor: formatearCelular(propietario?.telefono) || null,
    motivo: cita.motivo || '',
    tipo,
    consultorio: consultorio?.nombre || null,
    urlAgenda: `${urlFrontend}/agenda?fecha=${cita.fecha}`,
  }
}

module.exports = {
  MINUTOS_MIN,
  MINUTOS_MAX,
  TOPE_DIARIO,
  minutosValidos,
  inicioCita,
  inicioDelDia,
  debeAvisar,
  horaTexto,
  datosCorreo,
}
