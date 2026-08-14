// Duracion estimada (minutos) por tipo de cita. Fuente unica de verdad para
// calcular la horaFin estimada de un walk-in y para detectar posibles cruces
// de horario con citas programadas. Ajustable sin tocar la logica del controlador.
const DURACION_ESTIMADA_MINUTOS = {
  consulta_general: 30,
  vacunacion: 15,
  cirugia: 60,
  desparasitacion: 15,
  control: 20,
  urgencia: 30,
  peluqueria: 45,
  laboratorio: 15,
  radiografia: 20,
  otro: 30,
};

module.exports = { DURACION_ESTIMADA_MINUTOS };
